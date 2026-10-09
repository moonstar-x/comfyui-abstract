import { Label } from '@components/ui/third-party/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/third-party/shadcn/select';
import type { Nullable } from '@core/utils/types';
import type { WorkflowModelDefinition } from '@core/workflows/definitions';
import { useId, useMemo } from 'react';
import type { FC } from 'react';

export interface WorkflowModelPickerProps {
  models: readonly WorkflowModelDefinition[];
  onChange: (model: Nullable<string>) => void;
  value: Nullable<string>;
}

export const WorkflowModelPicker: FC<WorkflowModelPickerProps> = ({ models, value, onChange }) => {
  const id = useId();
  const items = useMemo(() => models.map((model) => ({ value: model.alias, label: model.alias })), [models]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Model</Label>
      <Select<string> items={items} value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-72" id={id}>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.alias} value={model.alias}>{model.alias}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
