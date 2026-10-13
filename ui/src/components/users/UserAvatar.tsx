import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/third-party/shadcn/avatar';
import type { Nullable } from '@core/utils/types';
import { cn } from 'cn';
import type { FC } from 'react';

const getInitials = (username: string): string => username.slice(0, 2).toUpperCase();

export interface UserAvatarProps {
  className?: string;
  pictureUrl: Nullable<string>;
  username: string;
}

export const UserAvatar: FC<UserAvatarProps> = ({ className, pictureUrl, username }) => (
  <Avatar className={cn('rounded-lg after:rounded-lg', className)}>
    {pictureUrl !== null && <AvatarImage alt="" className="rounded-lg" src={pictureUrl} />}
    <AvatarFallback className="rounded-lg">{getInitials(username)}</AvatarFallback>
  </Avatar>
);
