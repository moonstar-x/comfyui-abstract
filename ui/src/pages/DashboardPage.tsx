import { DailyActivityChart } from '@components/dashboard/DailyActivityChart';
import { DashboardStatCard } from '@components/dashboard/DashboardStatCard';
import { GenerationTimings } from '@components/dashboard/GenerationTimings';
import { useDashboard } from '@components/dashboard/hooks/useDashboard';
import { MostActiveUsers } from '@components/dashboard/MostActiveUsers';
import { TopModels } from '@components/dashboard/TopModels';
import { WorkflowBreakdown } from '@components/dashboard/WorkflowBreakdown';
import { Skeleton } from '@components/ui/third-party/shadcn/skeleton';
import { CalendarDays, CalendarRange, Clock, Sparkles, Users } from 'lucide-react';
import type { FC, ReactNode } from 'react';

const STAT_GRID_CLASSES = 'grid grid-cols-2 gap-3 page-sm:grid-cols-3 page-lg:grid-cols-5';
const SPLIT_GRID_CLASSES = 'grid gap-5 page-lg:grid-cols-2';

// The odd card out spans the whole row on phones.
const USERS_CARD_CLASSES = 'col-span-2 page-sm:col-span-1';

const PageShell: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex flex-1 flex-col gap-5 p-4 page-md:p-6">
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">How everyone is using the app.</p>
    </div>
    {children}
  </div>
);

const LoadingDashboard: FC = () => (
  <div aria-busy="true" aria-label="Loading dashboard" className="flex flex-col gap-5">
    <div className={STAT_GRID_CLASSES}>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton className={index === 0 ? `h-32 rounded-xl ${USERS_CARD_CLASSES}` : 'h-32 rounded-xl'} key={index} />
      ))}
    </div>
    <Skeleton className="h-72 rounded-xl" />
    <div className={SPLIT_GRID_CLASSES}>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
    <Skeleton className="h-48 rounded-xl" />
    <Skeleton className="h-96 rounded-xl" />
  </div>
);

const DashboardPage: FC = () => {
  const { data, error, isPending } = useDashboard();

  if (isPending) {
    return <PageShell><LoadingDashboard /></PageShell>;
  }

  if (error !== null) {
    return (
      <PageShell>
        <div className="flex min-h-60 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/25 bg-accent/40 p-4 text-center text-sm text-muted-foreground">
          {error.message}
        </div>
      </PageShell>
    );
  }

  const { dailyActivity, generations, mostActiveUsers, timing, topModels, users, workflows } = data;

  return (
    <PageShell>
      <div className={STAT_GRID_CLASSES}>
        <DashboardStatCard category="general" className={USERS_CARD_CLASSES} description="Registered accounts" icon={Users} label="Users" value={users.count} />
        <DashboardStatCard
          category="image"
          change={{ label: 'yesterday', previous: generations.previous.today }}
          description="Since midnight UTC"
          icon={Clock}
          label="Today"
          value={generations.today}
        />
        <DashboardStatCard
          category="image"
          change={{ label: 'last week', previous: generations.previous.thisWeek }}
          description="Since Monday"
          icon={CalendarDays}
          label="This week"
          value={generations.thisWeek}
        />
        <DashboardStatCard
          category="image"
          change={{ label: 'last month', previous: generations.previous.thisMonth }}
          description="Since the 1st"
          icon={CalendarRange}
          label="This month"
          value={generations.thisMonth}
        />
        <DashboardStatCard category="audio" description="Total generations" icon={Sparkles} label="All time" value={generations.allTime} />
      </div>
      <DailyActivityChart days={dailyActivity} />
      <div className={SPLIT_GRID_CLASSES}>
        <WorkflowBreakdown workflows={workflows} />
        <TopModels models={topModels} />
      </div>
      <GenerationTimings timing={timing} />
      <MostActiveUsers users={mostActiveUsers} />
    </PageShell>
  );
};

export default DashboardPage;
