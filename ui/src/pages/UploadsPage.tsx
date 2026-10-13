import { useMediaTypeParam } from '@components/history/hooks/useMediaTypeParam';
import { MediaTypeFilter } from '@components/history/MediaTypeFilter';
import { UploadList } from '@components/uploads/UploadList';
import type { FC } from 'react';

const EMPTY_MESSAGE = 'You have not uploaded anything yet';

const UploadsPage: FC = () => {
  const [mediaType, setMediaType] = useMediaTypeParam();

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="sr-only">My Uploads</h1>
        <MediaTypeFilter value={mediaType} onChange={setMediaType} />
      </div>

      <UploadList emptyMessage={mediaType === undefined ? EMPTY_MESSAGE : `${EMPTY_MESSAGE} of this type`} filter={{ mediaType }} />
    </div>
  );
};

export default UploadsPage;
