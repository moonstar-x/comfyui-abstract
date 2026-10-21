import { useAuth } from '@components/auth/AuthContext';
import { RouteDefs } from '@core/router/routes';
import type { FC } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

export interface AuthRedirectState {
  from: string;
}

const isAuthRedirectState = (value: unknown): value is AuthRedirectState => typeof value === 'object' &&
  value !== null &&
  'from' in value &&
  typeof value.from === 'string';

/**
 * Where to send the user once they log in, only allowing paths inside the app.
 */
export const getRedirectPath = (state: unknown): string => {
  if (!isAuthRedirectState(state) || !state.from.startsWith('/') || state.from.startsWith('//')) {
    return RouteDefs.home;
  }

  return state.from;
};

/**
 * Renders the nested routes only for logged in users, sending everyone else to the login page.
 */
export const RequireAuth: FC = () => {
  const { isAuthenticated } = useAuth();
  const { pathname, search, hash } = useLocation();

  if (!isAuthenticated) {
    const state: AuthRedirectState = { from: `${pathname}${search}${hash}` };
    return <Navigate replace state={state} to={RouteDefs.login} />;
  }

  return <Outlet />;
};

/**
 * Renders the nested routes only for logged out users. This is also what moves the user forward after logging in.
 */
export const RequireGuest: FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const state: unknown = location.state;

  if (isAuthenticated) {
    return <Navigate replace to={getRedirectPath(state)} />;
  }

  return <Outlet />;
};
