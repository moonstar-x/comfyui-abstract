import { RouteDefs } from '@components/router/routes';
import { lazy, Suspense } from 'react';
import type { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const HomePage = lazy(async () => await import('@pages/HomePage'));

// TODO: Implement a good Suspense fallback.
export const Router: FC = () => (
  <BrowserRouter>
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<HomePage />} path={RouteDefs.home} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
