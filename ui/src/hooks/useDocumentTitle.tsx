import { useEffect } from 'react';

const TITLE_SUFFIX = 'ComfyUI Abstract';

export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    document.title = `${title} | ${TITLE_SUFFIX}`;
  }, [title]);
};
