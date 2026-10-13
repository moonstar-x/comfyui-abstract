import pgPromise from 'pg-promise';
import { POSTGRES_DATABASE, POSTGRES_HOST, POSTGRES_MAX_CONNECTIONS, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER } from '../../../config/environment.js';

export const pgp: pgPromise.IMain = pgPromise({
  // Pins date math (date_trunc, intervals, day buckets) to UTC no matter how the server is configured.
  // Runs once per new pooled connection, and statements on a connection run in order, so it lands before any query.
  connect: ({ client, useCount }) => {
    if (useCount === 0) {
      void client.query('SET TimeZone TO \'UTC\'');
    }
  }
});

export const database: pgPromise.IDatabase<object> = pgp({
  host: POSTGRES_HOST,
  port: POSTGRES_PORT,
  database: POSTGRES_DATABASE,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  max: POSTGRES_MAX_CONNECTIONS
});
