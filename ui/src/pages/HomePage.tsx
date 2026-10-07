import type { FC } from 'react';

const HomePage: FC = () => (
  <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
    <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
    <div className="flex min-h-90 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 text-sm text-muted-foreground">
      Pick a workflow from the sidebar
    </div>
  </div>
);

export default HomePage;
