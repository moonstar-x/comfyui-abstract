import type { FC, ReactNode } from 'react';

export interface SettingsSectionProps {
  children: ReactNode;
  description: string;
  title: string;
}

export const SettingsSection: FC<SettingsSectionProps> = ({ children, description, title }) => (
  <section className="flex flex-col gap-5 rounded-xl border p-4 page-md:p-6">
    <div className="flex flex-col gap-1">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </section>
);
