import ffmpeg from 'fluent-ffmpeg';
import { DataSource } from 'typeorm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { Media } from '../media/entities/media.entity';
import { MediaFile } from '../media/entities/media-file.entity';
import { MediaVersion } from '../media/entities/media-version.entity';
import { MediaMetadata } from '../media/entities/media-metadata.entity';
import { VIDEO_RENDITIONS } from '../processing/processing.constants';
import { scanBuffer } from './av-scanner';
import { indexMediaDoc } from './indexer';

function s3() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
  });
}
const BUCKET = process.env.S3_BUCKET!;

async function download(key: string, dest: string) {
  const res = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Buffer[] = [];
  for await (const c of res.Body as Readable) chunks.push(Buffer.from(c));
  await fs.writeFile(dest, Buffer.concat(chunks));
}

async function uploadFile(localPath: string, key: string, mime: string) {
  const body = await fs.readFile(localPath);
  await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: mime }));
  return body.length;
}

function probe(file: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) =>
    ffmpeg.ffprobe(file, (err, data) => (err ? reject(err) : resolve(data))),
  );
}

function transcodeHls(input: string, height: number, bitrate: number, outDir: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        `-vf scale=-2:${height}`,
        `-b:v ${bitrate}k`,
        `-maxrate ${Math.round(bitrate * 1.07)}k`,
        `-bufsize ${bitrate * 2}k`,
        '-preset veryfast',
        '-g 48', '-keyint_min 48', '-sc_threshold 0',
        '-hls_time 6',
        '-hls_playlist_type vod',
        `-hls_segment_filename ${join(outDir, `${name}_%03d.ts`)}`,
      ])
      .output(join(outDir, `${name}.m3u8`))
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

function poster(input: string, out: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({ timestamps: ['10%'], filename: 'poster.jpg', folder: out, size: '1280x?' })
      .on('end', () => resolve())
      .on('error', reject);
  });
}

/**
 * Video pipeline: download → AV scan → probe → for each rendition ≤ source height,
 * transcode to HLS → upload segments + playlists → write ABR master.m3u8 → poster
 * thumbnail → persist versions/files/metadata → ready → index.
 */
export async function processVideo(ds: DataSource, mediaId: string, storageKey: string) {
  const mediaRepo = ds.getRepository(Media);
  const fileRepo = ds.getRepository(MediaFile);
  const verRepo = ds.getRepository(MediaVersion);
  const metaRepo = ds.getRepository(MediaMetadata);

  const media = await mediaRepo.findOne({ where: { id: mediaId } });
  if (!media) throw new Error(`Media ${mediaId} not found`);

  const work = join(tmpdir(), `mv-${randomUUID()}`);
  await fs.mkdir(work, { recursive: true });
  const input = join(work, 'input');

  try {
    await download(storageKey, input);
    await scanBuffer(await fs.readFile(input));

    const info = await probe(input);
    const vStream = info.streams.find((s) => s.codec_type === 'video');
    const srcHeight = vStream?.height ?? 1080;
    media.width = vStream?.width;
    media.height = srcHeight;
    media.durationSec = info.format.duration ? Number(info.format.duration) : undefined;

    const baseKey = `derivatives/${media.ownerId}/${mediaId}`;
    const renditions = VIDEO_RENDITIONS.filter((r) => r.height <= srcHeight + 1);
    if (renditions.length === 0) renditions.push(VIDEO_RENDITIONS[0]);

    const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
    const versions: Partial<MediaVersion>[] = [];

    for (const r of renditions) {
      await transcodeHls(input, r.height, r.bitrate, work, r.name);
      // upload playlist + its segments
      const entries = await fs.readdir(work);
      let bytes = 0;
      for (const f of entries.filter((f) => f.startsWith(`${r.name}.`) || f.startsWith(`${r.name}_`))) {
        const mime = f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
        bytes += await uploadFile(join(work, f), `${baseKey}/hls/${f}`, mime);
      }
      masterLines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${r.bitrate * 1000},RESOLUTION=auto,NAME="${r.name}"`,
        `${r.name}.m3u8`,
      );
      versions.push({ mediaId, rendition: r.name as any, storageKey: `${baseKey}/hls/${r.name}.m3u8`, bitrateKbps: r.bitrate, codec: 'h264', bytes });
    }

    // ABR master playlist
    const masterPath = join(work, 'master.m3u8');
    await fs.writeFile(masterPath, masterLines.join('\n'));
    await uploadFile(masterPath, `${baseKey}/hls/master.m3u8`, 'application/vnd.apple.mpegurl');
    versions.push({ mediaId, rendition: 'hls_master' as any, storageKey: `${baseKey}/hls/master.m3u8`, codec: 'h264' });

    await verRepo.delete({ mediaId });
    await verRepo.save(versions.map((v) => verRepo.create(v)));

    // poster thumbnails (reuse image variants table)
    await poster(input, work);
    const posterBytes = await uploadFile(join(work, 'poster.jpg'), `${baseKey}/poster.jpg`, 'image/jpeg');
    await fileRepo.delete({ mediaId });
    await fileRepo.save([
      fileRepo.create({ mediaId, variant: 'medium', storageKey: `${baseKey}/poster.jpg`, mime: 'image/jpeg', bytes: posterBytes }),
      fileRepo.create({ mediaId, variant: 'original', storageKey, mime: 'video/mp4', bytes: info.format.size ? Number(info.format.size) : undefined }),
    ]);

    const audio = info.streams.find((s) => s.codec_type === 'audio');
    await metaRepo.save(metaRepo.create({
      mediaId,
      frameRate: vStream?.avg_frame_rate ? eval(vStream.avg_frame_rate) : undefined,
      audioCodec: audio?.codec_name,
    }));

    media.status = 'ready';
    media.publishedAt = media.publishedAt ?? new Date();
    await mediaRepo.save(media);
    await indexMediaDoc(ds, mediaId);
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
}
