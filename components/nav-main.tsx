import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
  label = "HR",
  hideLabel = false,
  openSection,
  onOpenChange,
  onItemClick,
}: {
  items: {
    id: string
    title: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      id: string
      title: string
      tab: string
      icon?: React.ReactNode
      isActive?: boolean
    }[]
  }[]
  label?: string
  /** إخفاء عنوان المجموعة (مثلاً قسم واحد قابل للطي فقط) */
  hideLabel?: boolean
  openSection?: string | null
  onOpenChange?: (section: string | null) => void
  onItemClick?: (tab: string) => void
}) {
  const { isRtl } = useLanguage()
  const { state } = useSidebar()
  const [flyoutTop, setFlyoutTop] = useState<Record<string, number>>({})

  const updateFlyoutTop = (id: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const maxTop = Math.max(72, window.innerHeight - 420)
    setFlyoutTop((value) => ({
      ...value,
      [id]: Math.min(Math.max(rect.top - 8, 72), maxTop),
    }))
  }

  return (
    <SidebarGroup>
      {!hideLabel && label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.id}
            open={openSection === item.id}
            onOpenChange={(open) => {
              if (onOpenChange) {
                onOpenChange(open ? item.id : null)
              }
            }}
            className="group/collapsible"
            render={<SidebarMenuItem />}
          >
            <CollapsibleTrigger
              render={<SidebarMenuButton isActive={item.isActive} />}
              onMouseEnter={(event) => updateFlyoutTop(item.id, event.currentTarget)}
              onFocus={(event) => updateFlyoutTop(item.id, event.currentTarget)}
              onClick={(event) => updateFlyoutTop(item.id, event.currentTarget)}
            >
              {item.icon}
              <span>{item.title}</span>
              <ChevronRightIcon
                className={cn(
                  "ms-auto transition-transform duration-200 group-data-open/collapsible:rotate-90",
                  isRtl && "-scale-x-100"
                )}
              />
            </CollapsibleTrigger>
            {state === 'collapsed' && (
              <div
                className={cn('sidebar-collapsed-flyout', openSection === item.id && 'is-open')}
                style={{ '--flyout-top': `${flyoutTop[item.id] ?? 96}px` } as React.CSSProperties}
              >
                <div className="sidebar-collapsed-flyout-title">
                  {item.icon}
                  <span>{item.title}</span>
                  <ChevronRightIcon
                    className={cn(
                      "sidebar-collapsed-flyout-arrow",
                      !isRtl && "rotate-180"
                    )}
                  />
                </div>
                <div className="sidebar-collapsed-flyout-list">
                  {item.items?.map((subItem) => (
                    <a
                      key={subItem.id}
                      href={`#${subItem.tab}`}
                      aria-current={subItem.isActive ? 'page' : undefined}
                      data-active={subItem.isActive ? 'true' : undefined}
                      onClick={(event) => {
                        event.preventDefault()
                        onItemClick?.(subItem.tab)
                        onOpenChange?.(null)
                      }}
                    >
                      {subItem.icon}
                      <span>{subItem.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.id}>
                    <SidebarMenuSubButton
                      render={
                        <a
                          href={`#${subItem.tab}`}
                          aria-current={subItem.isActive ? 'page' : undefined}
                          onClick={(e) => {
                            e.preventDefault()
                            onItemClick?.(subItem.tab)
                          }}
                        />
                      }
                      isActive={subItem.isActive}
                    >
                      {subItem.icon}
                      <span>{subItem.title}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
