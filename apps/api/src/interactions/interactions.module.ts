import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment, Download, Favorite, View } from './entities/interaction.entities';
import { Media } from '../media/entities/media.entity';
import { InteractionsService } from './interactions.service';
import { InteractionsController } from './interactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([View, Download, Favorite, Comment, Media])],
  providers: [InteractionsService],
  controllers: [InteractionsController],
})
export class InteractionsModule {}
