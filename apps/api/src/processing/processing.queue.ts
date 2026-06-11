import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, ProcessJobData } from './processing.constants';

/** Enqueues image/video processing jobs onto BullMQ (consumed by the worker process). */
@Injectable()
export class ProcessingQueue implements OnModuleDestroy {
  private readonly imageQueue: Queue<ProcessJobData>;
  private readonly videoQueue: Queue<ProcessJobData>;

  constructor(config: ConfigService) {
    const connection = {
      host: config.getOrThrow('REDIS_HOST'),
      port: Number(config.get('REDIS_PORT', 6379)),
    };
    this.imageQueue = new Queue(QUEUE_NAMES.IMAGE, { connection });
    this.videoQueue = new Queue(QUEUE_NAMES.VIDEO, { connection });
  }

  async enqueueImage(data: ProcessJobData) {
    await this.imageQueue.add('process', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async enqueueVideo(data: ProcessJobData) {
    await this.videoQueue.add('process', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 15000 },
      removeOnComplete: 500,
      removeOnFail: 2000,
    });
  }

  async onModuleDestroy() {
    await this.imageQueue.close();
    await this.videoQueue.close();
  }
}
