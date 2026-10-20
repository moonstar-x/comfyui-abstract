import type { FeedView } from '@components/history/hooks/useFeedViewParam';
import { Button } from '@components/ui/third-party/shadcn/button';
import { LayoutGrid, Rows3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FC } from 'react';

interface FeedViewOption {
  icon: LucideIcon;
  label: string;
  value: FeedView;
}

const FEED_VIEW_OPTIONS: readonly FeedViewOption[] = [
  { icon: Rows3, label: 'Feed view', value: 'feed' },
  { icon: LayoutGrid, label: 'Grid view', value: 'grid' }
];

export interface FeedViewToggleProps {
  onChange: (value: FeedView) => void;
  value: FeedView;
}

export const FeedViewToggle: FC<FeedViewToggleProps> = ({ onChange, value }) => (
  <fieldset className="inline-flex shrink-0 gap-0.5 rounded-lg border p-0.5">
    <legend className="sr-only">View</legend>
    {FEED_VIEW_OPTIONS.map((option) => {
      const Icon = option.icon;
      const isSelected = value === option.value;

      return (
        <Button
          aria-label={option.label}
          aria-pressed={isSelected}
          key={option.value}
          size="icon-sm"
          title={option.label}
          type="button"
          variant={isSelected ? 'secondary' : 'ghost'}
          onClick={() => { onChange(option.value); }}
        >
          <Icon aria-hidden="true" />
        </Button>
      );
    })}
  </fieldset>
);
