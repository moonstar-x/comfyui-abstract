import { DashboardEmptyState, DashboardSection } from '@components/dashboard/DashboardSection';
import { formatStatDuration } from '@components/dashboard/format';
import type { Nullable } from '@core/utils/types';
import type { DurationStats, GenerationTimingStats } from '@services/api/dashboard';
import type { FC } from 'react';

const COLUMNS: Array<{ key: keyof DurationStats; label: string }> = [
  { key: 'min', label: 'Min' },
  { key: 'median', label: 'Median' },
  { key: 'avg', label: 'Average' },
  { key: 'p95', label: 'P95' },
  { key: 'max', label: 'Max' }
];

interface TimingRowProps {
  description: string;
  label: string;
  stats: Nullable<DurationStats>;
}

const TimingRow: FC<TimingRowProps> = ({ description, label, stats }) => (
  <tr className="border-t">
    <th className="py-3 pr-4 text-left font-normal" scope="row">
      <span className="block font-medium">{label}</span>
      <span className="block text-xs text-muted-foreground">{description}</span>
    </th>
    {COLUMNS.map(({ key }) => (
      <td className="px-3 py-3 text-right font-medium tabular-nums" key={key}>
        {stats === null ? '—' : formatStatDuration(stats[key])}
      </td>
    ))}
  </tr>
);

export interface GenerationTimingsProps {
  timing: GenerationTimingStats;
}

export const GenerationTimings: FC<GenerationTimingsProps> = ({ timing }) => (
  <DashboardSection
    description={`Where generation time goes, across ${timing.sampleCount.toLocaleString()} ${timing.sampleCount === 1 ? 'generation' : 'generations'}.`}
    title="Queue wait vs render time"
  >
    {timing.sampleCount === 0
      ? <DashboardEmptyState>No generation has timing data yet</DashboardEmptyState>
      : (
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
            <table className="w-full min-w-xl text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium" scope="col"><span className="sr-only">Stage</span></th>
                  {COLUMNS.map(({ key, label }) => (
                    <th className="px-3 pb-2 text-right font-medium" key={key} scope="col">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TimingRow description="Queued until ComfyUI picked it up" label="Queue wait" stats={timing.queueWait} />
                <TimingRow description="Time ComfyUI spent running it" label="Render" stats={timing.render} />
              </tbody>
            </table>
          </div>
        )}
  </DashboardSection>
);
