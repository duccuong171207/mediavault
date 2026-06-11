import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAlbumDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(['photo', 'video', 'mixed']) type?: string;
  @IsOptional() @IsIn(['public', 'unlisted', 'private']) visibility?: string;
}

export class UpdateAlbumDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(['public', 'unlisted', 'private']) visibility?: string;
}

export class ReorderDto {
  @IsArray() order!: string[]; // mediaIds in desired order
}

export class SetCoverDto {
  @IsString() mediaId!: string;
}

export class AddMediaDto {
  @IsArray() mediaIds!: string[];
}
