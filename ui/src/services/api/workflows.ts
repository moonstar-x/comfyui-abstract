import { API_URL } from '@core/config/environment';
import type { WorkflowDefinition } from '@core/workflows/definitions';
import type { WorkflowType } from '@services/websocket/messages/client';

const isWorkflowDefinition = (value: unknown): value is WorkflowDefinition => typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string' &&
  'models' in value &&
  Array.isArray(value.models);

const getErrorMessage = (body: unknown): null | string => {
  if (typeof body !== 'object' || body === null || !('error' in body) || typeof body.error !== 'object' || body.error === null) {
    return null;
  }

  return 'message' in body.error && typeof body.error.message === 'string' ? body.error.message : null;
};

export const fetchWorkflowDefinition = async (type: WorkflowType): Promise<WorkflowDefinition> => {
  const response = await fetch(new URL(`/workflows/${encodeURIComponent(type)}`, API_URL));
  const body: unknown = await response.json();
  const data: unknown = typeof body === 'object' && body !== null && 'data' in body ? body.data : null;
  if (!response.ok || !isWorkflowDefinition(data)) {
    throw new Error(getErrorMessage(body) ?? `Could not load the ${type} workflow (HTTP ${response.status.toString()}).`);
  }

  return data;
};
