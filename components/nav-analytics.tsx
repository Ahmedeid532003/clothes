import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavAnalytics({
  analytics,
  onItemClick,
}: {
  analytics: {
    id: string
    name: string
    tab: string
    icon: React.ReactNode
    isActive?: boolean
  }[]
  onItemClick?: (tab: string) => void
}) {
  const { state } = useSidebar()

  return (
    <SidebarGroup className="sidebar-analytics-group">
      {/* Group label intentionally hidden — no "التحليلات" in sidebar */}
      <SidebarMenu>
        {analytics.map((item) => (
          <SidebarMenuItem key={item.id} className={`sidebar-analytics-item sidebar-analytics-item-${item.id}`}>
            <SidebarMenuButton
              onClick={() => onItemClick?.(item.tab)}
              isActive={item.isActive}
              tooltip={state === 'collapsed' ? item.name : undefined}
              className={`sidebar-analytics-button sidebar-analytics-button-${item.id}${
                item.id === 'dashboard'
                  ? ' !h-auto !overflow-visible [&>span:last-child]:!whitespace-normal [&>span:last-child]:!overflow-visible [&>span:last-child]:!text-clip'
                  : ''
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </SidebarMenuButton>
            {state === 'collapsed' && (
              <div className="sidebar-collapsed-flyout sidebar-collapsed-flyout-single">
                <button type="button" onClick={() => onItemClick?.(item.tab)} data-active={item.isActive ? 'true' : undefined}>
                  {item.icon}
                  <span>{item.name}</span>
                </button>
              </div>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
