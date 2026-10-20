import { Button } from '@components/ui/third-party/shadcn/button';
import { MEDIA_TYPE_OPTIONS } from '@core/generations/generations';
import type { MediaType } from '@core/generations/generations';
import type { Optional } from '@core/utils/types';
import { Layers } from 'lucide-react';
import type { FC } from 'react';

export interface MediaTypeFilterProps {
  onChange: (value: Optional<MediaType>) => void;
  value: Optional<MediaType>;
}

export const MediaTypeFilter: FC<MediaTypeFilterProps> = ({ onChange, value }) => (
  <fieldset className="flex flex-wrap gap-1.5">
    <legend className="sr-only">Filter by media type</legend>
    <Button aria-pressed={value === undefined} size="sm" type="button" variant={value === undefined ? 'default' : 'outline'} onClick={() => { onChange(undefined); }}>
      <Layers aria-hidden="true" />
      All
    </Button>
    {MEDIA_TYPE_OPTIONS.map((option) => {
      const Icon = option.icon;
      const isSelected = value === option.value;

      return (
        <Button aria-pressed={isSelected} key={option.value} size="sm" type="button" variant={isSelected ? 'default' : 'outline'} onClick={() => { onChange(option.value); }}>
          <Icon aria-hidden="true" />
          {option.label}
        </Button>
      );
    })}
  </fieldset>
);
