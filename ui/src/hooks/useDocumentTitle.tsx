import { setDocumentTitle } from '@core/utils/title';
import { useEffect } from 'react';

const TITLE_SUFFIX = 'ComfyUI Abstract';

export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    setDocumentTitle(`${title} | ${TITLE_SUFFIX}`);
  }, [title]);
};
