import { useAuth } from '@components/auth/AuthContext';
import { PasswordSettings } from '@components/settings/PasswordSettings';
import { ProfilePictureSettings } from '@components/settings/ProfilePictureSettings';
import type { FC } from 'react';

const SettingsPage: FC = () => {
  const { user } = useAuth();
  // RequireAuth only renders the page with a user, this just narrows the type.
  if (user === null) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{`Manage the profile of ${user.username}.`}</p>
      </div>
      <div className="flex max-w-2xl flex-col gap-5">
        <ProfilePictureSettings user={user} />
        <PasswordSettings />
      </div>
    </div>
  );
};

export default SettingsPage;
