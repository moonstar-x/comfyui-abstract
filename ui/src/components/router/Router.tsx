import { RequireAuth, RequireGuest } from '@components/auth/AuthRoutes';
import { AppLayout } from '@components/layout/AppLayout';
import { AuthLayout } from '@components/layout/AuthLayout';
import { DynamicRouteDefs, RouteDefs } from '@core/router/routes';
import { lazy } from 'react';
import type { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const DashboardPage = lazy(async () => await import('@pages/DashboardPage'));
const HistoryPage = lazy(async () => await import('@pages/HistoryPage'));
const LoginPage = lazy(async () => await import('@pages/LoginPage'));
const SettingsPage = lazy(async () => await import('@pages/SettingsPage'));
const SignUpPage = lazy(async () => await import('@pages/SignUpPage'));
const UploadsPage = lazy(async () => await import('@pages/UploadsPage'));
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
          <Route element={<WorkflowPage />} path={DynamicRouteDefs.workflowById(':id')} />
          <Route element={<DashboardPage />} path={RouteDefs.home} />
          <Route element={<HistoryPage />} path={RouteDefs.feed} />
          {/* Not built with historyByUser(), which would encode the colon of the param. */}
          <Route element={<HistoryPage />} path={`${RouteDefs.history}/:username`} />
          <Route element={<UploadsPage />} path={RouteDefs.uploads} />
          <Route element={<SettingsPage />} path={RouteDefs.settings} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);
