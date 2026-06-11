import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLE } from '../../users/entities/role.entity';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(3) username!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsString() displayName?: string;
  @IsIn([ROLE.USER, ROLE.ADMIN]) role!: 'USER' | 'ADMIN';
}

export class UpdateUserDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsIn(['active', 'suspended', 'pending']) status?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() socialLinks?: Record<string, string>;
}
