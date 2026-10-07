import { useTheme } from '@components/theme/ThemeContext';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/third-party/shadcn/tooltip';
import { Moon, Sun } from 'lucide-react';
import type { FC } from 'react';

export const ThemeToggle: FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} mode`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            aria-label={label}
            size="icon"
            variant="ghost"
            onClick={() => {
              setTheme(nextTheme);
            }}
          />
        )}
      >
        {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
      </TooltipTrigger>
      <TooltipContent align="end" side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
};
