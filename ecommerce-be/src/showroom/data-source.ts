import { DataSource } from 'typeorm';
import { showroomEntities } from './entities';
import { CreateShowroomTables1757923200000 } from './migrations/1757923200000-CreateShowroomTables';

/**
 * Standalone DataSource for the TypeORM CLI, so showroom migrations can be run
 * without a datasource file existing anywhere else in the repo:
 *
 *   npx typeorm-ts-node-commonjs migration:run \
 *     -d src/showroom/data-source.ts
 *
 * Alternatively set SHOWROOM_RUN_MIGRATIONS=true and the module runs them on boot.
 */
export const showroomDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'ecommerce_db',
  entities: showroomEntities,
  migrations: [CreateShowroomTables1757923200000],
  synchronize: false,
});

export default showroomDataSource;
