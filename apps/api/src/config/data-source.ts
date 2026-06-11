import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '../../../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'mediavault',
  password: process.env.POSTGRES_PASSWORD ?? 'mediavault',
  database: process.env.POSTGRES_DB ?? 'mediavault',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production', // dev convenience; migrations in prod
  logging: false,
};

export default new DataSource(dataSourceOptions);
