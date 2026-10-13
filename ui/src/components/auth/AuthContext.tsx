import type { Nullable } from '@core/utils/types';
import { createUser, login as requestLogin } from '@services/api/auth';
import type { Credentials } from '@services/api/auth';
import { removeProfilePicture, changePassword as requestPasswordChange, uploadProfilePicture } from '@services/api/users';
import type { PasswordChange } from '@services/api/users';
import { getSession, setSession, subscribeToSession } from '@services/auth/session';
import type { PublicUser } from '@services/auth/session';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Context, FC, ReactNode } from 'react';

interface ContextValue {
  changePassword: (change: PasswordChange) => Promise<void>;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  removePicture: () => Promise<void>;
  signUp: (credentials: Credentials) => Promise<void>;
  uploadPicture: (file: File) => Promise<void>;
  user: Nullable<PublicUser>;
}

/**
 * Keeps the stored session in sync with the user the API returned after changing it.
 */
const setSessionUser = (user: PublicUser): void => {
  const session = getSession();
  if (session !== null) {
    setSession({ ...session, user });
  }
};

const AuthContext: Context<Nullable<ContextValue>> = createContext<Nullable<ContextValue>>(null);

interface Props {
  children: ReactNode;
}

export const AuthProvider: FC<Props> = ({ children }) => {
  const queryClient = useQueryClient();
  const session = useSyncExternalStore(subscribeToSession, getSession);
  const user = session?.user ?? null;

  useEffect(() => {
    // Covers logging out as well as the API rejecting the token, so no cached data outlives the session.
    if (session === null) {
      queryClient.clear();
    }
  }, [queryClient, session]);

  const login = useCallback(async (credentials: Credentials) => {
    setSession(await requestLogin(credentials));
  }, []);

  const signUp = useCallback(async (credentials: Credentials) => {
    // The API does not issue a token on sign up, so log in with the same credentials right after.
    await createUser(credentials);
    setSession(await requestLogin(credentials));
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  // Lists such as the generation users carry the picture too, so they are refetched with the new one.
  const uploadPicture = useCallback(async (file: File) => {
    setSessionUser(await uploadProfilePicture(file));
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const removePicture = useCallback(async () => {
    setSessionUser(await removeProfilePicture());
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const changePassword = useCallback(async (change: PasswordChange) => {
    setSessionUser(await requestPasswordChange(change));
  }, []);

  const context = useMemo<ContextValue>(() => ({
    changePassword,
    isAuthenticated: user !== null,
    login,
    logout,
    removePicture,
    signUp,
    uploadPicture,
    user
  }), [changePassword, login, logout, removePicture, signUp, uploadPicture, user]);

  return (
    <AuthContext value={context}>
      {children}
    </AuthContext>
  );
};

export const useAuth = (): ContextValue => {
  const context = use(AuthContext);
  if (context === null) {
    throw new Error('You must call useAuth inside of an AuthProvider.');
  }

  return context;
};
