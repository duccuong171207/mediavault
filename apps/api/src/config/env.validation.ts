import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsInt, IsString, validateSync } from 'class-validator';

/** Strongly-typed, validated environment configuration. */
class EnvVars {
  @IsString() NODE_ENV = 'development';
  @IsInt() API_PORT = 4000;

  @IsString() POSTGRES_HOST!: string;
  @IsInt() POSTGRES_PORT = 5432;
  @IsString() POSTGRES_USER!: string;
  @IsString() POSTGRES_PASSWORD!: string;
  @IsString() POSTGRES_DB!: string;

  @IsString() REDIS_HOST!: string;
  @IsInt() REDIS_PORT = 6379;

  @IsString() ELASTIC_NODE!: string;

  @IsString() S3_ENDPOINT!: string;
  @IsString() S3_REGION = 'us-east-1';
  @IsString() S3_BUCKET!: string;
  @IsString() S3_ACCESS_KEY!: string;
  @IsString() S3_SECRET_KEY!: string;
  @IsString() S3_PUBLIC_URL!: string;
  @IsBoolean() S3_FORCE_PATH_STYLE = true;

  @IsString() CLAMAV_HOST = 'localhost';
  @IsInt() CLAMAV_PORT = 3310;
  @IsBoolean() CLAMAV_ENABLED = true;

  @IsString() JWT_ACCESS_SECRET!: string;
  @IsString() JWT_REFRESH_SECRET!: string;
  @IsInt() JWT_ACCESS_TTL = 900;
  @IsInt() JWT_REFRESH_TTL = 604800;
  @IsString() COOKIE_DOMAIN = 'localhost';
}

const toBool = (v: unknown) => v === true || v === 'true' || v === '1';

export function validateEnv(config: Record<string, unknown>) {
  const parsed = plainToInstance(EnvVars, {
    ...config,
    API_PORT: Number(config.API_PORT ?? 4000),
    POSTGRES_PORT: Number(config.POSTGRES_PORT ?? 5432),
    REDIS_PORT: Number(config.REDIS_PORT ?? 6379),
    CLAMAV_PORT: Number(config.CLAMAV_PORT ?? 3310),
    CLAMAV_ENABLED: toBool(config.CLAMAV_ENABLED ?? true),
    S3_FORCE_PATH_STYLE: toBool(config.S3_FORCE_PATH_STYLE ?? true),
    JWT_ACCESS_TTL: Number(config.JWT_ACCESS_TTL ?? 900),
    JWT_REFRESH_TTL: Number(config.JWT_REFRESH_TTL ?? 604800),
  });
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return parsed;
}

export type AppConfig = EnvVars;
