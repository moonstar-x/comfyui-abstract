import { saveFile } from '@core/utils/files';
import type { FC, MouseEvent, ReactNode } from 'react';

export interface DownloadLinkProps {
  children: ReactNode;
  className?: string;
  url: string;
}

/**
 * A link that saves the file at the URL when clicked. The download attribute alone is ignored for files on another origin, such as the API,
 * so a plain click saves it through saveFile instead. Clicks with a modifier key are left to the browser, such as to open the file in a new tab.
 */
export const DownloadLink: FC<DownloadLinkProps> = ({ children, className, url }) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    void saveFile(url);
  };

  return (
    <a download className={className} href={url} onClick={handleClick}>
      {children}
    </a>
  );
};
