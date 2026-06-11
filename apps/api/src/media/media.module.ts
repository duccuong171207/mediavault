import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { MediaFile } from './entities/media-file.entity';
import { MediaVersion } from './entities/media-version.entity';
import { MediaMetadata } from './entities/media-metadata.entity';
import { Tag, MediaTag } from './entities/tag.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { ProcessingQueue } from '../processing/processing.queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media, MediaFile, MediaVersion, MediaMetadata, Tag, MediaTag]),
  ],
  providers: [MediaService, ProcessingQueue],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
