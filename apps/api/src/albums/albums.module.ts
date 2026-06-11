import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Album } from './entities/album.entity';
import { AlbumMedia } from './entities/album-media.entity';
import { AlbumsService } from './albums.service';
import { AlbumsController } from './albums.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Album, AlbumMedia])],
  providers: [AlbumsService],
  controllers: [AlbumsController],
})
export class AlbumsModule {}
