import { Worker } from 'bullmq';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../config/data-source';
import { QUEUE_NAMES, ProcessJobData } from '../processing/processing.constants';
import { processImage } from './image.processor';
import { processVideo } from './video.processor';
import { Media } from '../media/entities/media.entity';

loadEnv({ path: join(__dirname, '../../../../.env') });

/**
 * Standalone worker process (separate container). Consumes the image + video
 * BullMQ queues, runs Sharp/FFmpeg pipelines, and marks media failed on error.
 */
async function bootstrap() {
  const ds = await new DataSource({ ...dataSourceOptions, synchronize: false }).initialize();
  const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  };
  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);

  const markFailed = async (mediaId: string) => {
    await ds.getRepository(Media).update({ id: mediaId }, { status: 'failed' }).catch(() => undefined);
  };

  const imageWorker = new Worker<ProcessJobData>(
    QUEUE_NAMES.IMAGE,
    async (job) => {
      console.log(`[image] processing ${job.data.mediaId}`);
      await processImage(ds, job.data.mediaId, job.data.storageKey);
    },
    { connection, concurrency: concurrency * 2 },
  );

  const videoWorker = new Worker<ProcessJobData>(
    QUEUE_NAMES.VIDEO,
    async (job) => {
      console.log(`[video] processing ${job.data.mediaId}`);
      await processVideo(ds, job.data.mediaId, job.data.storageKey);
    },
    { connection, concurrency },
  );

  for (const [name, w] of [['image', imageWorker], ['video', videoWorker]] as const) {
    w.on('failed', async (job, err) => {
      console.error(`[${name}] job ${job?.id} failed: ${err.message}`);
      if (job?.data?.mediaId && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        await markFailed(job.data.mediaId);
      }
    });
    w.on('completed', (job) => console.log(`[${name}] completed ${job.id}`));
  }

  console.log(`MediaVault worker started (concurrency: image=${concurrency * 2}, video=${concurrency})`);

  const shutdown = async () => {
    await Promise.all([imageWorker.close(), videoWorker.close()]);
    await ds.destroy();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((e) => {
  console.error('Worker bootstrap failed', e);
  process.exit(1);
});
