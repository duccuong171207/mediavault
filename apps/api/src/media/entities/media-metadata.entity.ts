import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Media } from './media.entity';

/** 1:1 EXIF / technical metadata extracted on upload. */
@Entity('media_metadata')
export class MediaMetadata {
  @PrimaryColumn({ name: 'media_id', type: 'uuid' })
  mediaId!: string;

  @OneToOne(() => Media, (m) => m.metadata, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media!: Media;

  @Column({ nullable: true }) camera?: string;
  @Column({ nullable: true }) lens?: string;
  @Column({ type: 'int', nullable: true }) iso?: number;
  @Column({ nullable: true }) aperture?: string;
  @Column({ nullable: true }) shutter?: string;
  @Column({ name: 'focal_length', nullable: true }) focalLength?: string;
  @Column({ name: 'gps_lat', type: 'numeric', nullable: true }) gpsLat?: number;
  @Column({ name: 'gps_lng', type: 'numeric', nullable: true }) gpsLng?: number;
  @Column({ name: 'taken_at', type: 'timestamptz', nullable: true }) takenAt?: Date;
  @Column({ name: 'frame_rate', type: 'numeric', nullable: true }) frameRate?: number;
  @Column({ name: 'audio_codec', nullable: true }) audioCodec?: string;
  @Column({ type: 'jsonb', nullable: true }) raw?: Record<string, unknown>;
}
