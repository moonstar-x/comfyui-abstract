export const RouteDefs = {
  feed: '/feed',
  history: '/history',
  home: '/',
  login: '/login',
  signUp: '/signup',
  workflow: '/workflow'
} as const;

// Picks the model of the workflow page.
export const WORKFLOW_MODEL_SEARCH_PARAM = 'model';

export const DynamicRouteDefs = {
  historyByUser: (username: string): string => `${RouteDefs.history}/${encodeURIComponent(username)}`,
  workflowById: (id: string): string => `${RouteDefs.workflow}/${id}`,
  workflowWithModel: (id: string, model: string): string => `${RouteDefs.workflow}/${id}?${new URLSearchParams({ [WORKFLOW_MODEL_SEARCH_PARAM]: model }).toString()}`
};
