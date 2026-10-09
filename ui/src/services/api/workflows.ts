import type { WorkflowDefinition } from '@core/workflows/definitions';
import { apiRequest } from '@services/api/client';
import type { WorkflowType } from '@services/websocket/messages/client';

const isWorkflowDefinition = (value: unknown): value is WorkflowDefinition => typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string' &&
  'models' in value &&
  Array.isArray(value.models);

export const fetchWorkflowDefinition = async (type: WorkflowType): Promise<WorkflowDefinition> => {
  const data = await apiRequest(`/workflows/${encodeURIComponent(type)}`, { isAuthenticated: true });
  if (!isWorkflowDefinition(data)) {
    throw new Error(`The server returned an invalid definition for the ${type} workflow.`);
  }

  return data;
};
