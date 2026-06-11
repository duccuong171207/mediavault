import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateProfileDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Permissions, Public, Roles } from '../common/decorators/auth.decorators';
import { ROLE } from './entities/role.entity';
import { PERM } from './entities/permission.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  // ---------- admin user management ----------
  @Get('users')
  @Roles(ROLE.ADMIN, ROLE.SUPER_ADMIN)
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.users.list(Number(page), Number(limit), role, status);
  }

  @Post('users')
  @Permissions(PERM.USER_CREATE)
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor);
  }

  @Patch('users/:id')
  @Permissions(PERM.USER_EDIT)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete('users/:id')
  @Permissions(PERM.USER_DELETE)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.users.remove(id, actor);
  }

  // ---------- self ----------
  @Get('users/me')
  me(@CurrentUser('id') id: string) {
    return this.users.me(id);
  }

  @Patch('users/me')
  updateProfile(@CurrentUser('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(id, dto);
  }

  // ---------- public profile ----------
  @Public()
  @Get('u/:username')
  publicProfile(@Param('username') username: string) {
    return this.users.publicProfile(username);
  }
}
