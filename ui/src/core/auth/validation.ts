// Keep in sync with api/src/services/auth/schemas.ts.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;

export const validatePasswordLength = (password: string): string | undefined => {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be between ${PASSWORD_MIN_LENGTH.toString()} and ${PASSWORD_MAX_LENGTH.toString()} characters.`;
  }

  return undefined;
};
