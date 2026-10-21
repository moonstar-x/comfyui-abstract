import { GENERATIONS_QUERY_KEY } from '@components/history/hooks/useGenerations';
import { fetchDashboard } from '@services/api/dashboard';
import type { Dashboard } from '@services/api/dashboard';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Statistics about the whole application. Kept under the history query key so it refreshes along with the history.
 */
export const useDashboard = (): UseQueryResult<Dashboard> => useQuery(queryOptions({
  queryKey: [GENERATIONS_QUERY_KEY, 'dashboard'],
  queryFn: fetchDashboard
}));
