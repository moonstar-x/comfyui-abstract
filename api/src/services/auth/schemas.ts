import { z } from 'zod';

export const UsernameSchema: z.ZodString = z.string()
  .min(3)
  .max(64)
  .regex(/^[\w\-.]+$/u, 'Username may only contain letters, numbers, dots, dashes and underscores.');

export const PasswordSchema: z.ZodString = z.string().min(8).max(256);
