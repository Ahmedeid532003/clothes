import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function NavFlat({
  label,
  items,
  onItemClick,
}: {
  label: string;
  items: {
    id: string;
    title: string;
    tab: string;
    icon?: React.ReactNode;
    isActive?: boolean;
  }[];
  onItemClick?: (tab: string) => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={item.isActive}
              render={
                <a
                  href={`#${item.tab}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onItemClick?.(item.tab);
                  }}
                />
              }
            >
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
