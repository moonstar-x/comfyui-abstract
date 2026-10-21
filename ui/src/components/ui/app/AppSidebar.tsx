import { useAuth } from '@components/auth/AuthContext';
import { UserMenu } from '@components/auth/UserMenu';
import { ASSETS_SECTION, CATEGORY_TILE_CLASSES, DASHBOARD_NAV_ITEM, FEED_NAV_ITEM, isNavItemActive, toNavPathname, WORKFLOW_SECTIONS } from '@components/ui/app/navigation';
import type { NavItem, NavSection } from '@components/ui/app/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/third-party/shadcn/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@components/ui/third-party/shadcn/sidebar';
import { RouteDefs } from '@core/router/routes';
import { cn } from 'cn';
import { ChevronRight, Workflow } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

const NAV_BUTTON_CLASSES = cn(
  'h-10 gap-2.5 px-2',
  'group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-2!',
  'data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground',
  'data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground'
);

const ACTIVE_TILE_CLASSES = 'group-data-active/menu-button:bg-white/20 group-data-active/menu-button:text-sidebar-primary-foreground';

interface NavMenuItemProps {
  isActive: boolean;
  item: NavItem;
}

const NavMenuItem: FC<NavMenuItemProps> = ({ isActive, item }) => {
  const Icon = item.icon;
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={NAV_BUTTON_CLASSES}
        isActive={isActive}
        render={<NavLink end to={item.path} />}
        tooltip={item.title}
        onClick={() => {
          setOpenMobile(false);
        }}
      >
        <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md transition-colors', CATEGORY_TILE_CLASSES[item.category], ACTIVE_TILE_CLASSES)}>
          <Icon />
        </span>
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

// Sections are open by default, so only the titles of the ones the user collapsed are stored.
const COLLAPSED_SECTIONS_STORAGE_KEY = 'comfyui-abstract-sidebar-collapsed-sections';

const readCollapsedSections = (): string[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((title): title is string => typeof title === 'string') : [];
  } catch {
    return [];
  }
};

const storeSectionOpen = (title: string, isOpen: boolean): void => {
  try {
    const others = readCollapsedSections().filter((stored) => stored !== title);
    localStorage.setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify(isOpen ? others : [...others, title]));
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this session.
  }
};

interface NavMenuSectionProps {
  pathname: string;
  section: NavSection;
}

const NavMenuSection: FC<NavMenuSectionProps> = ({ pathname, section }) => {
  const [open, setOpen] = useState(() => !readCollapsedSections().includes(section.title));
  const { state } = useSidebar();
  // In icon mode the label is hidden, so a collapsed section would have no way to reopen.
  const isOpen = open || state === 'collapsed';

  return (
    <Collapsible
      open={isOpen}
      render={<SidebarGroup />}
      onOpenChange={(next) => {
        setOpen(next);
        storeSectionOpen(section.title, next);
      }}
    >
      <SidebarGroupLabel
        className="group/section-trigger cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        render={<CollapsibleTrigger />}
      >
        {section.title}
        <ChevronRight className="ml-auto transition-transform group-aria-expanded/section-trigger:rotate-90" />
      </SidebarGroupLabel>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {section.items.map((item) => (
              <NavMenuItem isActive={isNavItemActive(item, pathname)} item={item} key={item.path} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AppSidebar: FC = () => {
  const { user } = useAuth();
  const pathname = toNavPathname(useLocation().pathname, user?.username);
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1!"
              render={<Link to={RouteDefs.home} />}
              size="lg"
              tooltip="ComfyUI Abstract"
              onClick={() => {
                setOpenMobile(false);
              }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Workflow />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">ComfyUI Abstract</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Workflows</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <NavMenuItem isActive={isNavItemActive(DASHBOARD_NAV_ITEM, pathname)} item={DASHBOARD_NAV_ITEM} />
              <NavMenuItem isActive={isNavItemActive(FEED_NAV_ITEM, pathname)} item={FEED_NAV_ITEM} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {[...WORKFLOW_SECTIONS, ASSETS_SECTION].map((section) => (
          <NavMenuSection key={section.title} pathname={pathname} section={section} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-0.5">
          <UserMenu />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
