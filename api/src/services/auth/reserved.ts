/**
 * Usernames that are used as route segments and therefore cannot be registered.
 */
export const RESERVED_USERNAMES = {
  CURRENT_USER: 'me'
} as const;

const RESERVED_USERNAME_VALUES: ReadonlySet<string> = new Set(Object.values(RESERVED_USERNAMES));

export const isUsernameReserved = (username: string): boolean => RESERVED_USERNAME_VALUES.has(username.toLowerCase());
