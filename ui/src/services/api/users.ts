import { apiRequest } from '@services/api/client';
import { CURRENT_USER } from '@services/api/generations';
import { isPublicUser, isSession } from '@services/auth/session';
import type { PublicUser, Session } from '@services/auth/session';

// Keep in sync with the image upload content types of the API.
export const PROFILE_PICTURE_TYPES: readonly string[] = ['image/bmp', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'];

const toPublicUser = (data: unknown): PublicUser => {
  if (!isPublicUser(data)) {
    throw new Error('The server returned an unexpected user.');
  }

  return data;
};

/**
 * Replaces the profile picture of the current user and returns the updated user.
 */
export const uploadProfilePicture = async (file: File): Promise<PublicUser> => toPublicUser(await apiRequest(`/users/${CURRENT_USER}/picture`, { method: 'PUT', file, isAuthenticated: true }));

/**
 * Removes the profile picture of the current user and returns the updated user.
 */
export const removeProfilePicture = async (): Promise<PublicUser> => toPublicUser(await apiRequest(`/users/${CURRENT_USER}`, { method: 'PATCH', body: { pictureUrl: null }, isAuthenticated: true }));

export interface PasswordChange {
  currentPassword: string;
  password: string;
}

/**
 * Changes the password of the current user and returns a new session. Every token issued before, this one included, stops working.
 */
export const changePassword = async (change: PasswordChange): Promise<Session> => {
  const data = await apiRequest(`/users/${CURRENT_USER}/password`, { method: 'PUT', body: change, isAuthenticated: true });
  if (!isSession(data)) {
    throw new Error('The server returned an unexpected password change response.');
  }

  return data;
};
