import pgPromise from 'pg-promise';
import { POSTGRES_DATABASE, POSTGRES_HOST, POSTGRES_MAX_CONNECTIONS, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER } from '../../../config/environment.js';

export const pgp: pgPromise.IMain = pgPromise();

export const database: pgPromise.IDatabase<object> = pgp({
  host: POSTGRES_HOST,
  port: POSTGRES_PORT,
  database: POSTGRES_DATABASE,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  max: POSTGRES_MAX_CONNECTIONS
});
