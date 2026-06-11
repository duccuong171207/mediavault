import {
  IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';

export class PresignUploadDto {
  @IsString() filename!: string;
  @IsString() mime!: string;
  @IsInt() @Min(1) size!: number;
}

export class CompleteUploadDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsIn(['public', 'unlisted', 'private']) visibility?: string;
}

export class UpdateMediaDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsIn(['public', 'unlisted', 'private']) visibility?: string;
}

export class MediaQueryDto {
  @IsOptional() @IsIn(['photo', 'video']) type?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsString() owner?: string;
  @IsOptional() @IsIn(['trending', 'latest', 'popular']) sort?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() limit?: number;
}
