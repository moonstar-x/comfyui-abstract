import { CATEGORY_TILE_CLASSES, FOOTER_ITEMS, isNavItemActive, WORKFLOW_SECTIONS } from '@components/ui/app/navigation';
import type { NavItem } from '@components/ui/app/navigation';
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
  SidebarRail
} from '@components/ui/third-party/shadcn/sidebar';
import { RouteDefs } from '@core/router/routes';
import { cn } from 'cn';
import { Workflow } from 'lucide-react';
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

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={NAV_BUTTON_CLASSES}
        isActive={isActive}
        render={<NavLink end to={item.path} />}
        tooltip={item.title}
      >
        <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md transition-colors', CATEGORY_TILE_CLASSES[item.category], ACTIVE_TILE_CLASSES)}>
          <Icon />
        </span>
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export const AppSidebar: FC = () => {
  const { pathname } = useLocation();

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
        {WORKFLOW_SECTIONS.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => (
                  <NavMenuItem isActive={isNavItemActive(item, pathname)} item={item} key={item.path} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {FOOTER_ITEMS.map((item) => (
            <NavMenuItem isActive={isNavItemActive(item, pathname)} item={item} key={item.path} />
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
