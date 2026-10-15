import { DynamicRouteDefs, RouteDefs } from '@core/router/routes';
import type { Nullable } from '@core/utils/types';
import { CURRENT_USER } from '@services/api/generations';
import { AudioLines, FolderUp, History, ImagePlus, LayoutDashboard, Mic, Newspaper, WandSparkles } from 'lucide-react';
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
      { category: 'image', icon: WandSparkles, path: DynamicRouteDefs.workflowById('image-edit'), title: 'Edit Image' }
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

// Shown first in the sidebar, outside of any section. The dashboard is the homepage.
export const DASHBOARD_NAV_ITEM: NavItem = { category: 'general', icon: LayoutDashboard, path: RouteDefs.home, title: 'Dashboard' };
export const FEED_NAV_ITEM: NavItem = { category: 'general', icon: Newspaper, path: RouteDefs.feed, title: 'Feed' };

// Shown last in the sidebar, after the workflow sections.
export const ASSETS_SECTION: NavSection = {
  items: [
    { category: 'general', icon: FolderUp, path: RouteDefs.uploads, title: 'My Uploads' },
    { category: 'general', icon: History, path: DynamicRouteDefs.historyByUser(CURRENT_USER), title: 'My Generations' }
  ],
  title: 'Assets'
};

export const CATEGORY_TILE_CLASSES: Record<NavCategory, string> = {
  audio: 'bg-tile-audio text-tile-audio-foreground',
  general: 'bg-tile-general text-tile-general-foreground',
  image: 'bg-tile-image text-tile-image-foreground',
  video: 'bg-tile-video text-tile-video-foreground'
};

export const isNavItemActive = (item: NavItem, pathname: string): boolean => matchPath({ end: true, path: item.path }, pathname) !== null;

/**
 * The history of the logged in user can be reached through their username as well, it's matched as the path of My Generations.
 */
export const toNavPathname = (pathname: string, username: string | undefined): string => {
  if (username !== undefined && pathname === DynamicRouteDefs.historyByUser(username)) {
    return DynamicRouteDefs.historyByUser(CURRENT_USER);
  }

  return pathname;
};

/**
 * The navigation entry of a workflow type, used to label generations with the workflow that made them.
 */
export const findWorkflowNavItem = (type: string): Nullable<NavItem> => {
  const path = DynamicRouteDefs.workflowById(type);
  return WORKFLOW_SECTIONS.flatMap((section) => section.items).find((item) => item.path === path) ?? null;
};

export const findNavMatch = (pathname: string): Nullable<NavMatch> => {
  for (const section of WORKFLOW_SECTIONS) {
    const item = section.items.find((candidate) => isNavItemActive(candidate, pathname));
    if (item) {
      return { item, section: section.title };
    }
  }

  return null;
};
