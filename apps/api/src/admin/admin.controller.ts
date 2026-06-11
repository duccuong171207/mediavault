import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/auth.decorators';
import { PERM } from '../users/entities/permission.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permissions(PERM.ANALYTICS_VIEW)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('analytics')
  analytics(@Query('range') range: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily') {
    return this.admin.analytics(range);
  }

  @Get('activity')
  activity(@Query('limit') limit = '50') {
    return this.admin.activity(Number(limit));
  }
}
