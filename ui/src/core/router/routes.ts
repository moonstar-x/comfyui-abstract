export const RouteDefs = {
  home: '/',
  workflow: '/workflow'
} as const;

export const DynamicRouteDefs = {
  workflowById: (id: string): string => `${RouteDefs.workflow}/${id}`
};
