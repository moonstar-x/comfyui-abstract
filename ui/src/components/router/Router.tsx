import { AppLayout } from '@components/layout/AppLayout';
import { DynamicRouteDefs, RouteDefs } from '@core/router/routes';
import { lazy } from 'react';
import type { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const HomePage = lazy(async () => await import('@pages/HomePage'));
const WorkflowPage = lazy(async () => await import('@pages/WorkflowPage'));

export const Router: FC = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<HomePage />} path={RouteDefs.home} />
        <Route element={<WorkflowPage />} path={DynamicRouteDefs.workflowById(':id')} />
      </Route>
    </Routes>
  </BrowserRouter>
);
