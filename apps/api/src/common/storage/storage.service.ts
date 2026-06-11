import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

/** Thin wrapper over an S3-compatible store (AWS S3 / MinIO). */
@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    this.bucket = config.getOrThrow('S3_BUCKET');
    this.publicUrl = config.getOrThrow('S3_PUBLIC_URL');
    this.client = new S3Client({
      endpoint: config.getOrThrow('S3_ENDPOINT'),
      region: config.get('S3_REGION', 'us-east-1'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', true),
      credentials: {
        accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow('S3_SECRET_KEY'),
      },
    });
  }

  /** Presigned PUT URL so clients upload original bytes directly to storage. */
  async presignUpload(key: string, mime: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mime }),
      { expiresIn },
    );
  }

  /** Presigned GET URL for private/original downloads. */
  async presignDownload(key: string, expiresIn = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async putObject(key: string, body: Buffer, mime: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mime }),
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** Public CDN URL for a derivative key. */
  publicUrlFor(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
