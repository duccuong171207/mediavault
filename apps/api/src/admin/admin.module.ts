import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Media } from '../media/entities/media.entity';
import { Album } from '../albums/entities/album.entity';
import { View } from '../interactions/entities/interaction.entities';
import { ActivityLog } from '../system/entities/system.entities';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Media, Album, View, ActivityLog])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
