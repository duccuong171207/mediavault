import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public, Permissions } from '../common/decorators/auth.decorators';
import { PERM } from '../users/entities/permission.entity';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Public()
  @Get()
  list() {
    return this.categories.list();
  }

  @Post()
  @Permissions(PERM.CATEGORY_MANAGE)
  create(@Body() body: { name: string; slug: string; parentId?: number }) {
    return this.categories.create(body);
  }

  @Patch(':id')
  @Permissions(PERM.CATEGORY_MANAGE)
  update(@Param('id') id: string, @Body() body: any) {
    return this.categories.update(Number(id), body);
  }

  @Delete(':id')
  @Permissions(PERM.CATEGORY_MANAGE)
  remove(@Param('id') id: string) {
    return this.categories.remove(Number(id));
  }
}
