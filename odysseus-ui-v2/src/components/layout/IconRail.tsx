import { useCallback, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  FlaskConical,
  GitCompare,
  Image,
  ListTodo,
  Mail,
  MessageSquare,
  Settings,
  StickyNote,
  Users,
  FileText,
} from 'lucide-react'
import { useUiVisibility } from '@/hooks/useUiVisibility'
import { isNavVisible } from '@/lib/ui-visibility'
import { cn } from '@/lib/utils'

const RAIL_ITEMS = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/memory', label: 'Memory', icon: Brain },
  { to: '/cookbook', label: 'Cookbook', icon: BookOpen },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/research', label: 'Research', icon: FlaskConical },
  { to: '/email', label: 'Email', icon: Mail },
  { to: '/gallery', label: 'Gallery', icon: Image },
  { to: '/library', label: 'Documents', icon: FileText },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/group-chat', label: 'Group', icon: Users },
] as const

interface IconRailProps {
  side?: 'left' | 'right'
  mobileMini?: boolean
  onExpandSidebar?: () => void
  onOpenSidebar?: () => void
}

export function IconRail({
  side = 'left',
  mobileMini = false,
  onExpandSidebar,
  onOpenSidebar,
}: IconRailProps) {
  const { state } = useUiVisibility()
  const railRef = useRef<HTMLElement>(null)
  const visible = RAIL_ITEMS.filter((item) => isNavVisible(item.to, state))

  const startExpandDrag = useCallback(
    (clientX: number) => {
      window.dispatchEvent(
        new CustomEvent('odysseus:sidebar-expand-from-rail', {
          detail: { clientX, side },
        }),
      )
      onExpandSidebar?.()
    },
    [onExpandSidebar, side],
  )

  useEffect(() => {
    const rail = railRef.current
    if (!rail || mobileMini) return
    const handle = rail.querySelector<HTMLElement>('#rail-resize-handle')
    if (!handle) return

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      handle.classList.add('dragging')
      onExpandSidebar?.()
      requestAnimationFrame(() => startExpandDrag(e.clientX))
      const onUp = () => {
        handle.classList.remove('dragging')
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mouseup', onUp)
    }

    handle.addEventListener('mousedown', onMouseDown)
    return () => handle.removeEventListener('mousedown', onMouseDown)
  }, [mobileMini, onExpandSidebar, startExpandDrag])

  return (
    <nav
      ref={railRef}
      id="icon-rail"
      aria-label="Quick navigation"
      className={cn(
        'icon-rail flex w-12 shrink-0 flex-col items-center gap-1 border-border bg-panel/60 py-2',
        side === 'right' ? 'right-side border-l sidebar-right' : 'border-r',
        mobileMini && 'mobile-mini',
        mobileMini && side === 'right' && 'right-side',
      )}
    >
      {!mobileMini ? (
        <div
          id="rail-resize-handle"
          className="rail-resize-handle hidden md:block"
          aria-hidden
        />
      ) : null}

      {visible.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/chat'}
            title={item.label}
            className={({ isActive }) =>
              cn(
                'icon-rail-btn flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors',
                isActive && 'bg-primary/15 text-primary',
                !isActive && 'hover:bg-panel hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{item.label}</span>
          </NavLink>
        )
      })}
      <div className="mt-auto flex flex-col gap-1">
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            cn(
              'icon-rail-btn flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors',
              isActive && 'bg-primary/15 text-primary',
              !isActive && 'hover:bg-panel hover:text-foreground',
            )
          }
        >
          <Settings className="h-4 w-4" aria-hidden />
          <span className="sr-only">Settings</span>
        </NavLink>
        {onOpenSidebar ? (
          <button
            type="button"
            className="icon-rail-btn flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-panel hover:text-foreground md:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </nav>
  )
}
