import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { MediaService } from './media.service';
import {
  CompleteUploadDto, MediaQueryDto, PresignUploadDto, UpdateMediaDto,
} from './dto/media.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public, Permissions } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PERM } from '../users/entities/permission.entity';

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private media: MediaService) {}

  @Public()
  @Get()
  feed(@Query() q: MediaQueryDto) {
    return this.media.feed(q);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.media.detail(id);
  }

  @Public()
  @Get(':id/similar')
  similar(@Param('id') id: string) {
    return this.media.similar(id);
  }

  @Post('upload/presign')
  @Permissions(PERM.MEDIA_UPLOAD)
  presign(@Body() dto: PresignUploadDto, @CurrentUser() user: AuthUser) {
    return this.media.presign(dto, user);
  }

  @Post(':id/complete')
  @Permissions(PERM.MEDIA_UPLOAD)
  complete(@Param('id') id: string, @Body() dto: CompleteUploadDto, @CurrentUser() user: AuthUser) {
    return this.media.complete(id, dto, user);
  }

  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.media.status(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto, @CurrentUser() user: AuthUser) {
    return this.media.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.media.remove(id, user);
  }
}
