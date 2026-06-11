import sharp from 'sharp';
import exifr from 'exifr';
import { DataSource } from 'typeorm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { Media } from '../media/entities/media.entity';
import { MediaFile } from '../media/entities/media-file.entity';
import { MediaMetadata } from '../media/entities/media-metadata.entity';
import { IMAGE_SIZES } from '../processing/processing.constants';
import { scanBuffer } from './av-scanner';
import { indexMediaDoc } from './indexer';

/** Standalone S3 client for the worker process. */
function s3() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}
const BUCKET = process.env.S3_BUCKET!;

async function getObject(key: string): Promise<Buffer> {
  const res = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Buffer[] = [];
  for await (const c of res.Body as Readable) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

async function putObject(key: string, body: Buffer, mime: string) {
  await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: mime }));
}

/**
 * Image pipeline: AV scan → EXIF extract → generate thumbnail/small/medium/large
 * (+ keep original) → persist media_files + media_metadata → mark ready → index.
 */
export async function processImage(ds: DataSource, mediaId: string, storageKey: string) {
  const mediaRepo = ds.getRepository(Media);
  const fileRepo = ds.getRepository(MediaFile);
  const metaRepo = ds.getRepository(MediaMetadata);

  const media = await mediaRepo.findOne({ where: { id: mediaId } });
  if (!media) throw new Error(`Media ${mediaId} not found`);

  const original = await getObject(storageKey);
  await scanBuffer(original);

  const image = sharp(original, { failOn: 'none' });
  const meta = await image.metadata();
  media.width = meta.width;
  media.height = meta.height;

  const baseKey = `derivatives/${media.ownerId}/${mediaId}`;
  const files: Partial<MediaFile>[] = [];

  // responsive sizes via Sharp (always re-encode to webp for web delivery)
  for (const [variant, width] of Object.entries(IMAGE_SIZES)) {
    if (meta.width && meta.width < width && variant !== 'thumbnail') continue;
    const buf = await sharp(original)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: variant === 'thumbnail' ? 60 : 82 })
      .toBuffer();
    const key = `${baseKey}/${variant}.webp`;
    await putObject(key, buf, 'image/webp');
    const dims = await sharp(buf).metadata();
    files.push({ mediaId, variant: variant as any, storageKey: key, width: dims.width, height: dims.height, bytes: buf.length, mime: 'image/webp' });
  }
  // original record (already in storage)
  files.push({ mediaId, variant: 'original', storageKey, width: meta.width, height: meta.height, bytes: original.length, mime: `image/${meta.format}` });

  await fileRepo.delete({ mediaId });
  await fileRepo.save(files.map((f) => fileRepo.create(f)));

  // EXIF
  try {
    const exif = await exifr.parse(original, { gps: true });
    if (exif) {
      await metaRepo.save(
        metaRepo.create({
          mediaId,
          camera: [exif.Make, exif.Model].filter(Boolean).join(' ') || undefined,
          lens: exif.LensModel,
          iso: exif.ISO,
          aperture: exif.FNumber ? `f/${exif.FNumber}` : undefined,
          shutter: exif.ExposureTime ? `${exif.ExposureTime}s` : undefined,
          focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : undefined,
          gpsLat: exif.latitude,
          gpsLng: exif.longitude,
          takenAt: exif.DateTimeOriginal,
          raw: undefined,
        }),
      );
    }
  } catch {
    /* no EXIF — fine */
  }

  media.status = 'ready';
  media.publishedAt = media.publishedAt ?? new Date();
  await mediaRepo.save(media);
  await indexMediaDoc(ds, mediaId);
}
