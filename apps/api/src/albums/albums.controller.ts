import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { AlbumsService } from './albums.service';
import {
  AddMediaDto, CreateAlbumDto, ReorderDto, SetCoverDto, UpdateAlbumDto,
} from './dto/album.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('albums')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlbumsController {
  constructor(private albums: AlbumsService) {}

  @Public()
  @Get()
  list(@Query('owner') owner?: string) {
    return this.albums.list(owner);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.albums.detail(id);
  }

  @Post()
  create(@Body() dto: CreateAlbumDto, @CurrentUser() user: AuthUser) {
    return this.albums.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlbumDto, @CurrentUser() user: AuthUser) {
    return this.albums.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.albums.remove(id, user);
  }

  @Post(':id/media')
  addMedia(@Param('id') id: string, @Body() dto: AddMediaDto, @CurrentUser() user: AuthUser) {
    return this.albums.addMedia(id, dto, user);
  }

  @Put(':id/order')
  reorder(@Param('id') id: string, @Body() dto: ReorderDto, @CurrentUser() user: AuthUser) {
    return this.albums.reorder(id, dto, user);
  }

  @Put(':id/cover')
  setCover(@Param('id') id: string, @Body() dto: SetCoverDto, @CurrentUser() user: AuthUser) {
    return this.albums.setCover(id, dto, user);
  }
}
