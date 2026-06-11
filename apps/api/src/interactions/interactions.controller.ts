import {
  Body, Controller, Delete, Get, Ip, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { InteractionsService } from './interactions.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('media/:id')
export class InteractionsController {
  constructor(private interactions: InteractionsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('view')
  view(@Param('id') id: string, @Ip() ip: string, @Req() req: Request) {
    return this.interactions.recordView(id, (req as any).user?.id, ip);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('download')
  download(@Param('id') id: string, @Ip() ip: string, @Req() req: Request) {
    return this.interactions.download(id, (req as any).user?.id, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post('favorite')
  favorite(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.interactions.toggleFavorite(id, userId);
  }

  @Public()
  @Get('comments')
  comments(@Param('id') id: string) {
    return this.interactions.listComments(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments')
  addComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { body: string; parentId?: string },
  ) {
    return this.interactions.addComment(id, userId, body.body, body.parentId);
  }
}
