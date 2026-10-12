import { DynamicRouteDefs } from '@core/router/routes';
import type { Nullable } from '@core/utils/types';
import { AudioLines, ImagePlus, Mic, WandSparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { matchPath } from 'react-router';

export type NavCategory = 'audio' | 'general' | 'image' | 'video';

export interface NavItem {
  category: NavCategory;
  icon: LucideIcon;
  path: string;
  title: string;
}

export interface NavSection {
  items: NavItem[];
  title: string;
}

export interface NavMatch {
  item: NavItem;
  section: Nullable<string>;
}

// TODO: This is dynamic and must come from the backend.
export const WORKFLOW_SECTIONS: NavSection[] = [
  {
    items: [
      { category: 'image', icon: ImagePlus, path: DynamicRouteDefs.workflowById('generate-image'), title: 'Generate Image' },
      { category: 'image', icon: WandSparkles, path: DynamicRouteDefs.workflowById('edit-image'), title: 'Edit Image' }
    ],
    title: 'Image Generation'
  },
  {
    items: [
      { category: 'audio', icon: AudioLines, path: DynamicRouteDefs.workflowById('generate-music'), title: 'Generate Music' },
      { category: 'audio', icon: Mic, path: DynamicRouteDefs.workflowById('cover-music'), title: 'Cover Music' }
    ],
    title: 'Audio Generation'
  }
];

export const CATEGORY_TILE_CLASSES: Record<NavCategory, string> = {
  audio: 'bg-tile-audio text-tile-audio-foreground',
  general: 'bg-tile-general text-tile-general-foreground',
  image: 'bg-tile-image text-tile-image-foreground',
  video: 'bg-tile-video text-tile-video-foreground'
};

export const isNavItemActive = (item: NavItem, pathname: string): boolean => matchPath({ end: true, path: item.path }, pathname) !== null;

export const findNavMatch = (pathname: string): Nullable<NavMatch> => {
  for (const section of WORKFLOW_SECTIONS) {
    const item = section.items.find((candidate) => isNavItemActive(candidate, pathname));
    if (item) {
      return { item, section: section.title };
    }
  }

  return null;
};
