import { UserAvatar } from '@components/users/UserAvatar';
import { formatRelativeTime } from '@core/generations/generations';
import { DynamicRouteDefs } from '@core/router/routes';
import type { GenerationUserSummary } from '@services/api/dashboard';
import { cn } from 'cn';
import type { FC } from 'react';
import { Link } from 'react-router';

const formatGenerationCount = (count: number): string => count === 1 ? '1 generation' : `${count.toLocaleString()} generations`;

interface RankedUserProps {
  maxCount: number;
  rank: number;
  summary: GenerationUserSummary;
}

const RankedUser: FC<RankedUserProps> = ({ maxCount, rank, summary }) => {
  // Bars are relative to the top user, so the leader always fills the row.
  const barWidth = `${(maxCount === 0 ? 0 : (summary.generationCount / maxCount) * 100).toString()}%`;

  return (
    <li>
      <Link className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent" to={DynamicRouteDefs.historyByUser(summary.username)}>
        <span className={cn('w-5 shrink-0 text-center text-sm font-semibold tabular-nums', rank > 3 && 'text-muted-foreground')}>{rank}</span>
        <UserAvatar pictureUrl={summary.pictureUrl} username={summary.username} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2 text-sm leading-none">
            <span className="truncate font-medium">{`@${summary.username}`}</span>
            <span className="shrink-0 font-medium tabular-nums">{formatGenerationCount(summary.generationCount)}</span>
          </div>
          <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: barWidth }} />
          </div>
          <span className="text-xs leading-none text-muted-foreground">{`Last generated ${formatRelativeTime(summary.lastGeneratedAt)}`}</span>
        </div>
      </Link>
    </li>
  );
};

export interface MostActiveUsersProps {
  users: GenerationUserSummary[];
}

export const MostActiveUsers: FC<MostActiveUsersProps> = ({ users }) => {
  const maxCount = users[0]?.generationCount ?? 0;

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Most active users</h2>
        <p className="text-sm text-muted-foreground">Ranked by how many generations they have made.</p>
      </div>
      {users.length === 0
        ? <p className="py-6 text-center text-sm text-muted-foreground">Nobody has generated anything yet</p>
        : (
            <ol className="-mx-2 flex flex-col gap-0.5">
              {users.map((summary, index) => (
                <RankedUser key={summary.username} maxCount={maxCount} rank={index + 1} summary={summary} />
              ))}
            </ol>
          )}
    </section>
  );
};
