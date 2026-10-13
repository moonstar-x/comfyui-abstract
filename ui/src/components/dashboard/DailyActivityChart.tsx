import { DashboardEmptyState, DashboardSection } from '@components/dashboard/DashboardSection';
import { formatGenerationCount } from '@components/dashboard/format';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/third-party/shadcn/tooltip';
import type { GenerationDailyCount } from '@services/api/dashboard';
import type { FC } from 'react';

const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const longDayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', weekday: 'short' });

// Multiples of these (times a power of ten) keep the middle tick a whole number.
const NICE_STEPS = [1, 2, 4, 6, 8, 10];
const MIN_AXIS_MAX = 4;

/**
 * Rounds the largest value up to a clean axis maximum, e.g. 37 -> 40, 130 -> 200.
 */
const getAxisMax = (max: number): number => {
  if (max <= MIN_AXIS_MAX) {
    return MIN_AXIS_MAX;
  }

  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = NICE_STEPS.find((candidate) => candidate * magnitude >= max) ?? 10;
  return step * magnitude;
};

/**
 * Days come as YYYY-MM-DD, parsed as a local date so they are not shifted by the time zone.
 */
const parseDay = (day: string): Date => {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};

interface DayBarProps {
  axisMax: number;
  count: GenerationDailyCount;
}

const DayBar: FC<DayBarProps> = ({ axisMax, count }) => {
  const label = `${longDayFormat.format(parseDay(count.day))}: ${formatGenerationCount(count.generationCount)}`;
  const height = `${((count.generationCount / axisMax) * 100).toString()}%`;

  return (
    <Tooltip>
      {/* The whole column is the hit target, so short bars and empty days are still easy to hover. */}
      <TooltipTrigger
        aria-label={label}
        className="group flex h-full min-w-0 flex-1 cursor-default items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block w-full max-w-6 rounded-t-[4px] bg-primary/70 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" style={{ height }} />
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-semibold tabular-nums">{count.generationCount.toLocaleString()}</span>
        <span className="opacity-80">{dayFormat.format(parseDay(count.day))}</span>
      </TooltipContent>
    </Tooltip>
  );
};

export interface DailyActivityChartProps {
  days: GenerationDailyCount[];
}

export const DailyActivityChart: FC<DailyActivityChartProps> = ({ days }) => {
  const total = days.reduce((sum, day) => sum + day.generationCount, 0);
  const axisMax = getAxisMax(Math.max(0, ...days.map((day) => day.generationCount)));
  const ticks = [axisMax, axisMax / 2, 0];
  const middleDay = days[Math.floor(days.length / 2)];

  return (
    <DashboardSection
      aside={<span className="shrink-0 text-sm font-medium">{formatGenerationCount(total)}</span>}
      description={`Generations per day over the last ${days.length.toString()} days.`}
      title="Activity"
    >
      {total === 0
        ? <DashboardEmptyState>{`Nothing was generated in the last ${days.length.toString()} days`}</DashboardEmptyState>
        : (
            <div className="flex flex-col gap-2">
              <div className="flex h-44 gap-2">
                <div aria-hidden="true" className="flex w-8 shrink-0 flex-col justify-between text-right text-xs leading-none text-muted-foreground tabular-nums">
                  {ticks.map((tick) => <span key={tick}>{tick.toLocaleString()}</span>)}
                </div>
                <div className="relative flex-1">
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                    {ticks.map((tick) => <div className="h-px bg-border" key={tick} />)}
                  </div>
                  <ol className="relative flex h-full items-end gap-0.5">
                    {days.map((count) => (
                      <li className="flex h-full min-w-0 flex-1" key={count.day}>
                        <DayBar axisMax={axisMax} count={count} />
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div aria-hidden="true" className="flex justify-between pl-10 text-xs text-muted-foreground">
                <span>{days[0] === undefined ? null : dayFormat.format(parseDay(days[0].day))}</span>
                <span>{middleDay === undefined ? null : dayFormat.format(parseDay(middleDay.day))}</span>
                <span>Today</span>
              </div>
            </div>
          )}
    </DashboardSection>
  );
};
