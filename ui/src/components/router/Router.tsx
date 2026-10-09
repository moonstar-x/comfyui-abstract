import { RequireAuth, RequireGuest } from '@components/auth/AuthRoutes';
import { AppLayout } from '@components/layout/AppLayout';
import { AuthLayout } from '@components/layout/AuthLayout';
import { DynamicRouteDefs, RouteDefs } from '@core/router/routes';
import { lazy } from 'react';
import type { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const HomePage = lazy(async () => await import('@pages/HomePage'));
const LoginPage = lazy(async () => await import('@pages/LoginPage'));
const SignUpPage = lazy(async () => await import('@pages/SignUpPage'));
const WorkflowPage = lazy(async () => await import('@pages/WorkflowPage'));

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<RequireGuest />}>
        <Route element={<AuthLayout />}>
          <Route element={<LoginPage />} path={RouteDefs.login} />
          <Route element={<SignUpPage />} path={RouteDefs.signUp} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route element={<HomePage />} path={RouteDefs.home} />
          <Route element={<WorkflowPage />} path={DynamicRouteDefs.workflowById(':id')} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
