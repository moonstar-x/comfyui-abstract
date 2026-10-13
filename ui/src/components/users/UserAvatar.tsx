import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/third-party/shadcn/avatar';
import { API_URL } from '@core/config/environment';
import type { Nullable } from '@core/utils/types';
import { cn } from 'cn';
import type { FC } from 'react';

const getInitials = (username: string): string => username.slice(0, 2).toUpperCase();

// Uploaded pictures are paths relative to the API, while pictures set by URL are already absolute.
const toPictureSource = (pictureUrl: string): string => new URL(pictureUrl, API_URL).href;

export interface UserAvatarProps {
  className?: string;
  pictureUrl: Nullable<string>;
  username: string;
}

export const UserAvatar: FC<UserAvatarProps> = ({ className, pictureUrl, username }) => (
  <Avatar className={cn('rounded-lg after:rounded-lg', className)}>
    {pictureUrl !== null && <AvatarImage alt="" className="rounded-lg" src={toPictureSource(pictureUrl)} />}
    <AvatarFallback className="rounded-lg">{getInitials(username)}</AvatarFallback>
  </Avatar>
);
