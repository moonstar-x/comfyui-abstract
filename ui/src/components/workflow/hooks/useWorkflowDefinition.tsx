import type { WorkflowDefinition } from '@core/workflows/definitions';
import { fetchWorkflowDefinition } from '@services/api/workflows';
import type { WorkflowType } from '@services/websocket/messages/client';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

export const useWorkflowDefinition = (type: WorkflowType): UseQueryResult<WorkflowDefinition> => useQuery(queryOptions({
  queryKey: ['workflows', type],
  queryFn: async () => await fetchWorkflowDefinition(type),
  // The definition comes from the API config, which only changes when the API restarts.
  staleTime: Infinity
}));
