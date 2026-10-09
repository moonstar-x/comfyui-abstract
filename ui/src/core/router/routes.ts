export const RouteDefs = {
  home: '/',
  login: '/login',
  signUp: '/signup',
  workflow: '/workflow'
} as const;

export const DynamicRouteDefs = {
  workflowById: (id: string): string => `${RouteDefs.workflow}/${id}`
};
