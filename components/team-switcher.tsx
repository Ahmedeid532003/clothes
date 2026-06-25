"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { ChevronsUpDownIcon, LayoutGridIcon } from "lucide-react"

export function TeamSwitcher({
  teams,
  activeTeamId,
  onTeamChange,
  showAllBranches,
  onAllBranches,
}: {
  teams: {
    id?: string
    name: string
    logo: React.ReactNode
    plan: string
    imageUrl?: string | null
  }[]
  activeTeamId?: string | null
  onTeamChange?: (id: string) => void
  showAllBranches?: boolean
  onAllBranches?: () => void
}) {
  const { isMobile } = useSidebar()
  const { t, isRtl } = useLanguage()

  const activeTeam = React.useMemo(() => {
    if (activeTeamId) {
      return teams.find((t) => t.id === activeTeamId) ?? teams[0]
    }
    if (showAllBranches) {
      return {
        id: undefined,
        name: t('sidebar.allBranches'),
        logo: <LayoutGridIcon className="size-4" />,
        plan: teams[0]?.plan ?? '',
      }
    }
    return teams[0]
  }, [activeTeamId, teams, showAllBranches, t])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="sidebar-branch-trigger data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600/90 text-white shadow-lg shadow-blue-900/30">
              {activeTeam.logo}
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{activeTeam.name}</span>
            </div>
            <ChevronsUpDownIcon className="ms-auto text-sidebar-foreground/55" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="sidebar-control-menu sidebar-branches-menu min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : isRtl ? "left" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('sidebar.branches')}
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={team.id ?? team.name}
                  onClick={() => team.id && onTeamChange?.(team.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  {team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {showAllBranches && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-2 p-2" onClick={() => onAllBranches?.()}>
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      <LayoutGridIcon className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">
                      {t('sidebar.allBranches')}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
