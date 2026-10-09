import type { Nullable } from '../../../utils/types.js';
import { database } from '../client/postgres.js';
import type { UserRow } from '../models/auth.js';

export interface PublicUser {
  createdAt: Date;
  pictureUrl: Nullable<string>;
  updatedAt: Date;
  username: string;
}

export interface CreateUserData {
  passwordHash: string;
  pictureUrl: Nullable<string>;
  username: string;
}

export interface UpdateUserData {
  passwordHash?: string;
  pictureUrl?: Nullable<string>;
}

export const toPublicUser = (user: UserRow): PublicUser => ({
  username: user.username,
  pictureUrl: user.picture_url,
  createdAt: user.created_at,
  updatedAt: user.updated_at
});

export const findUserByUsername = async (username: string): Promise<Nullable<UserRow>> => {
  const query = 'SELECT * FROM users WHERE username = $1';
  return await database.oneOrNone<UserRow>(query, [username]);
};

export const createUser = async ({ username, passwordHash, pictureUrl }: CreateUserData): Promise<UserRow> => {
  const query = 'INSERT INTO users(username, password_hash, picture_url) VALUES($1, $2, $3) RETURNING *';
  return await database.one<UserRow>(query, [username, passwordHash, pictureUrl]);
};

export const updateUser = async (username: string, { passwordHash, pictureUrl }: UpdateUserData): Promise<UserRow> => {
  const query = `UPDATE users SET
    password_hash = COALESCE($2, password_hash),
    picture_url = CASE WHEN $3 THEN $4 ELSE picture_url END
    WHERE username = $1
    RETURNING *`;

  return await database.one<UserRow>(query, [username, passwordHash ?? null, pictureUrl !== undefined, pictureUrl ?? null]);
};
