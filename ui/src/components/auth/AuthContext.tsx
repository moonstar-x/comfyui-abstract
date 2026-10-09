import type { Nullable } from '@core/utils/types';
import { createUser, login as requestLogin } from '@services/api/auth';
import type { Credentials } from '@services/api/auth';
import { getSession, setSession, subscribeToSession } from '@services/auth/session';
import type { PublicUser } from '@services/auth/session';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Context, FC, ReactNode } from 'react';

interface ContextValue {
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  signUp: (credentials: Credentials) => Promise<void>;
  user: Nullable<PublicUser>;
}

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

  const context = useMemo<ContextValue>(() => ({
    isAuthenticated: user !== null,
    login,
    logout,
    signUp,
    user
  }), [login, logout, signUp, user]);

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
