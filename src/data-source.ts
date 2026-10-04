import { DataSource } from 'typeorm';
import { buildDataSourceOptions, entitiesDir } from './config/database.config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in the environment');
}

export default new DataSource({
  ...buildDataSourceOptions(databaseUrl),
  entities: [entitiesDir],
});
