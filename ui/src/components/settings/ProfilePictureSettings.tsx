import { useAuth } from '@components/auth/AuthContext';
import { SettingsSection } from '@components/settings/SettingsSection';
import { Button } from '@components/ui/third-party/shadcn/button';
import { UserAvatar } from '@components/users/UserAvatar';
import { PROFILE_PICTURE_TYPES } from '@services/api/users';
import type { PublicUser } from '@services/auth/session';
import { useMutation } from '@tanstack/react-query';
import { ImageMinus, ImageUp, LoaderCircle } from 'lucide-react';
import { useRef } from 'react';
import type { FC } from 'react';

export interface ProfilePictureSettingsProps {
  user: PublicUser;
}

export const ProfilePictureSettings: FC<ProfilePictureSettingsProps> = ({ user }) => {
  const { uploadPicture, removePicture } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useMutation({ mutationFn: uploadPicture });
  const removal = useMutation({ mutationFn: removePicture });
  const isPending = upload.isPending || removal.isPending;
  const error = upload.error ?? removal.error;

  return (
    <SettingsSection description="Shown next to your name across the app." title="Profile picture">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar className="size-20 text-xl" pictureUrl={user.pictureUrl} username={user.username} />
        <div className="flex flex-wrap gap-2">
          <input
            hidden
            accept={PROFILE_PICTURE_TYPES.join(',')}
            ref={inputRef}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) {
                removal.reset();
                upload.mutate(file);
              }

              // Allows selecting the same file again.
              if (inputRef.current !== null) {
                inputRef.current.value = '';
              }
            }}
          />
          <Button
            disabled={isPending}
            type="button"
            variant="outline"
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            {upload.isPending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <ImageUp data-icon="inline-start" />}
            {upload.isPending ? 'Uploading…' : 'Upload picture'}
          </Button>
          {user.pictureUrl !== null && (
            <Button
              disabled={isPending}
              type="button"
              variant="ghost"
              onClick={() => {
                upload.reset();
                removal.mutate();
              }}
            >
              {removal.isPending ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <ImageMinus data-icon="inline-start" />}
              Remove
            </Button>
          )}
        </div>
      </div>
      {error !== null && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error.message}</p>
      )}
    </SettingsSection>
  );
};
