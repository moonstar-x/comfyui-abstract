import { useMediaTypeParam } from '@components/history/hooks/useMediaTypeParam';
import { MediaTypeFilter } from '@components/history/MediaTypeFilter';
import { useSelection } from '@components/selection/hooks/useSelection';
import { SelectionActions } from '@components/selection/SelectionActions';
import { useDeleteUploads } from '@components/uploads/hooks/useUploads';
import { UploadList } from '@components/uploads/UploadList';
import type { FC } from 'react';

const EMPTY_MESSAGE = 'You have not uploaded anything yet';

const UploadsPage: FC = () => {
  const [mediaType, setMediaType] = useMediaTypeParam();
  const selection = useSelection(mediaType ?? '');
  const uploadsDeletion = useDeleteUploads();

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 page-md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="sr-only">My Uploads</h1>
        <MediaTypeFilter value={mediaType} onChange={setMediaType} />
        <SelectionActions
          confirmDescription="The selected files will be removed permanently and can no longer be used in workflows."
          deletion={uploadsDeletion}
          itemName="upload"
          selection={selection}
        />
      </div>

      {/* Tiles can't be deleted one by one while selecting, so clicking near their corner doesn't delete them by mistake. */}
      <UploadList
        canDelete={!selection.isSelecting}
        emptyMessage={mediaType === undefined ? EMPTY_MESSAGE : `${EMPTY_MESSAGE} of this type`}
        filter={{ mediaType }}
        selectedIds={selection.isSelecting ? selection.selectedIds : undefined}
        onSelect={selection.isSelecting ? (upload): void => { selection.toggle(upload.id); } : undefined}
      />
    </div>
  );
};

export default UploadsPage;
