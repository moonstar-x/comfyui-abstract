import { DashboardEmptyState, DashboardSection } from '@components/dashboard/DashboardSection';
import { formatGenerationCount } from '@components/dashboard/format';
import { ShareBar } from '@components/dashboard/ShareBar';
import { UserAvatar } from '@components/users/UserAvatar';
import { formatRelativeTime } from '@core/generations/generations';
import { DynamicRouteDefs } from '@core/router/routes';
import type { GenerationUserSummary } from '@services/api/dashboard';
import { cn } from 'cn';
import type { FC } from 'react';
import { Link } from 'react-router';

interface RankedUserProps {
  maxCount: number;
  rank: number;
  summary: GenerationUserSummary;
}

const RankedUser: FC<RankedUserProps> = ({ maxCount, rank, summary }) => (
  <li>
    <Link className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent" to={DynamicRouteDefs.historyByUser(summary.username)}>
      <span className={cn('w-5 shrink-0 text-center text-sm font-semibold tabular-nums', rank > 3 && 'text-muted-foreground')}>{rank}</span>
      <UserAvatar pictureUrl={summary.pictureUrl} username={summary.username} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-sm leading-none">
          <span className="truncate font-medium">{`@${summary.username}`}</span>
          <span className="shrink-0 font-medium tabular-nums">{formatGenerationCount(summary.generationCount)}</span>
        </div>
        <ShareBar max={maxCount} value={summary.generationCount} />
        <span className="text-xs leading-none text-muted-foreground">{`Last generated ${formatRelativeTime(summary.lastGeneratedAt)}`}</span>
      </div>
    </Link>
  </li>
);

export interface MostActiveUsersProps {
  users: GenerationUserSummary[];
}

export const MostActiveUsers: FC<MostActiveUsersProps> = ({ users }) => {
  const maxCount = users[0]?.generationCount ?? 0;

  return (
    <DashboardSection description="Ranked by how many generations they have made." title="Most active users">
      {users.length === 0
        ? <DashboardEmptyState>Nobody has generated anything yet</DashboardEmptyState>
        : (
            <ol className="-mx-2 flex flex-col gap-0.5">
              {users.map((summary, index) => (
                <RankedUser key={summary.username} maxCount={maxCount} rank={index + 1} summary={summary} />
              ))}
            </ol>
          )}
    </DashboardSection>
  );
};
