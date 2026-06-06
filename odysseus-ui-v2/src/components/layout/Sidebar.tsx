import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  ChevronDown,
  FlaskConical,
  GitCompare,
  GripVertical,
  Image,
  ListTodo,
  Mail,
  MessageSquare,
  Settings,
  StickyNote,
  Users,
  FileText,
} from 'lucide-react'
import * as notesApi from '@/api/notes'
import { useUiVisibility } from '@/hooks/useUiVisibility'
import {
  countFiredReminders,
  loadReminderDismissedAt,
} from '@/lib/workspace/noteReminders'
import { isNavVisible } from '@/lib/ui-visibility'
import { cn } from '@/lib/utils'

const SECTION_ORDER_KEY = 'sidebar-section-order'
const SECTION_COLLAPSED_KEY = 'section-collapsed'
const SIDEBAR_WIDTH_KEY = 'odysseus-sidebar-width'
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 700
const COLLAPSE_THRESHOLD = 150

function readCollapsedSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SECTION_COLLAPSED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function readSavedSidebarWidth(): number | null {
  try {
    const w = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) || '', 10)
    if (w >= MIN_SIDEBAR_WIDTH && w <= MAX_SIDEBAR_WIDTH) return w
  } catch {
    /* ignore */
  }
  return null
}

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

type NavGroup = {
  id: string
  title: string
  items: NavItem[]
}

const DEFAULT_GROUPS: NavGroup[] = [
  {
    id: 'chat-section',
    title: 'Chat',
    items: [
      { to: '/chat', label: 'Chat', icon: MessageSquare },
      { to: '/group-chat', label: 'Group chat', icon: Users },
      { to: '/agents', label: 'Agents', icon: Bot },
    ],
  },
  {
    id: 'workspace-section',
    title: 'Workspace',
    items: [
      { to: '/notes', label: 'Notes', icon: StickyNote },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/library', label: 'Documents', icon: FileText },
    ],
  },
  {
    id: 'tools-section',
    title: 'Tools',
    items: [
      { to: '/memory', label: 'Memory', icon: Brain },
      { to: '/cookbook', label: 'Cookbook', icon: BookOpen },
      { to: '/compare', label: 'Compare', icon: GitCompare },
      { to: '/research', label: 'Research', icon: FlaskConical },
      { to: '/email', label: 'Email', icon: Mail },
      { to: '/gallery', label: 'Gallery', icon: Image },
    ],
  },
]

function readSectionOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(SECTION_ORDER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : null
  } catch {
    return null
  }
}

function orderGroups(groups: NavGroup[]): NavGroup[] {
  const saved = readSectionOrder()
  if (!saved?.length) return groups
  const map = new Map(groups.map((g) => [g.id, g]))
  const ordered = saved.map((id) => map.get(id)).filter(Boolean) as NavGroup[]
  groups.forEach((g) => {
    if (!saved.includes(g.id)) ordered.push(g)
  })
  return ordered
}

function useNotesBadgeCount(): number {
  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesApi.fetchNotes(),
    refetchInterval: 60_000,
  })
  return countFiredReminders(notes, loadReminderDismissedAt())
}

function NavItemLink({
  item,
  notesBadge,
  onNavigate,
}: {
  item: NavItem
  notesBadge?: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const badge = item.to === '/notes' ? notesBadge : item.badge

  return (
    <NavLink
      to={item.to}
      end={item.to === '/chat'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'density-compact-tight relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          isActive
            ? 'bg-panel text-foreground font-medium'
            : 'text-muted hover:bg-panel hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
      {badge != null && badge > 0 ? (
        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </NavLink>
  )
}

interface SidebarProps {
  side?: 'left' | 'right'
  hidden?: boolean
  mobileOverlay?: boolean
  onNavigate?: () => void
  onCollapse?: () => void
  onExpandFromRail?: (width: number) => void
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { side = 'left', hidden = false, mobileOverlay = false, onNavigate, onCollapse, onExpandFromRail },
  ref,
) {
  const { state: visibility } = useUiVisibility()
  const notesBadge = useNotesBadgeCount()
  const [groups, setGroups] = useState(() => orderGroups(DEFAULT_GROUPS))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsedSections)
  const [dragId, setDragId] = useState<string | null>(null)
  const [width, setWidth] = useState<number | null>(() => readSavedSidebarWidth())
  const asideRef = useRef<HTMLElement | null>(null)
  const dragEnabled = useMemo(() => {
    const vis = localStorage.getItem('odysseus-ui-visibility')
    if (!vis) return true
    try {
      const parsed = JSON.parse(vis) as Record<string, boolean>
      return parsed['section-drag-reorder'] !== false
    } catch {
      return true
    }
  }, [])

  useEffect(() => {
    const node = asideRef.current
    if (!node || mobileOverlay) return

    const handle = node.querySelector<HTMLElement>('#sidebar-resize-handle')
    if (!handle) return

    let startX = 0
    let startWidth = 0
    let isRight = side === 'right'
    let collapsedDrag = false

    const onDrag = (e: MouseEvent) => {
      const delta = isRight ? startX - e.clientX : e.clientX - startX
      const rawWidth = startWidth + delta
      if (rawWidth < COLLAPSE_THRESHOLD) {
        node.style.width = `${Math.max(0, rawWidth)}px`
        node.style.opacity = String(Math.max(0.2, rawWidth / COLLAPSE_THRESHOLD))
        collapsedDrag = true
      } else {
        const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, rawWidth))
        node.style.width = `${next}px`
        node.style.opacity = ''
        collapsedDrag = false
        setWidth(next)
      }
    }

    const stopDrag = () => {
      node.classList.remove('resizing')
      handle.classList.remove('dragging')
      node.style.opacity = ''
      document.removeEventListener('mousemove', onDrag)
      document.removeEventListener('mouseup', stopDrag)
      if (collapsedDrag) {
        node.style.width = ''
        onCollapse?.()
      } else {
        const finalWidth = parseInt(node.style.width, 10)
        if (finalWidth >= MIN_SIDEBAR_WIDTH) {
          localStorage.setItem(SIDEBAR_WIDTH_KEY, String(finalWidth))
        }
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      isRight = side === 'right'
      startX = e.clientX
      startWidth = node.getBoundingClientRect().width
      collapsedDrag = false
      node.classList.add('resizing')
      handle.classList.add('dragging')
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', stopDrag)
    }

    handle.addEventListener('mousedown', onMouseDown)
    return () => handle.removeEventListener('mousedown', onMouseDown)
  }, [mobileOverlay, onCollapse, side])

  useEffect(() => {
    if (mobileOverlay) return
    const onExpand = (e: Event) => {
      const detail = (e as CustomEvent<{ clientX: number; side: 'left' | 'right' }>).detail
      const node = asideRef.current
      if (!node || !detail) return
      node.classList.remove('hidden')
      onExpandFromRail?.(MIN_SIDEBAR_WIDTH)
      const isRight = detail.side === 'right'
      const startX = detail.clientX
      let collapsedDrag = false

      const onDrag = (ev: MouseEvent) => {
        const delta = isRight ? startX - ev.clientX : ev.clientX - startX
        const rawWidth = Math.max(0, delta)
        if (rawWidth < COLLAPSE_THRESHOLD) {
          node.style.width = `${rawWidth}px`
          node.style.opacity = String(Math.max(0.3, rawWidth / COLLAPSE_THRESHOLD))
          collapsedDrag = true
        } else {
          const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, rawWidth))
          node.style.width = `${next}px`
          node.style.opacity = ''
        }
      }

      const stopDrag = () => {
        node.classList.remove('resizing')
        node.style.opacity = ''
        document.removeEventListener('mousemove', onDrag)
        document.removeEventListener('mouseup', stopDrag)
        if (collapsedDrag) {
          node.style.width = ''
          onCollapse?.()
        } else {
          const finalWidth = parseInt(node.style.width, 10)
          if (finalWidth >= MIN_SIDEBAR_WIDTH) {
            localStorage.setItem(SIDEBAR_WIDTH_KEY, String(finalWidth))
            setWidth(finalWidth)
            onExpandFromRail?.(finalWidth)
          }
        }
      }

      node.classList.add('resizing')
      node.style.width = '0px'
      node.style.opacity = '0.3'
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', stopDrag)
    }

    window.addEventListener('odysseus:sidebar-expand-from-rail', onExpand)
    return () => window.removeEventListener('odysseus:sidebar-expand-from-rail', onExpand)
  }, [mobileOverlay, onCollapse, onExpandFromRail])

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      asideRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  const onDragStart = useCallback(
    (id: string) => (e: React.DragEvent) => {
      if (!dragEnabled) return
      setDragId(id)
      e.dataTransfer.effectAllowed = 'move'
    },
    [dragEnabled],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (targetId: string) => (e: React.DragEvent) => {
      e.preventDefault()
      if (!dragId || dragId === targetId) return
      setGroups((prev) => {
        const next = [...prev]
        const from = next.findIndex((g) => g.id === dragId)
        const to = next.findIndex((g) => g.id === targetId)
        if (from < 0 || to < 0) return prev
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(next.map((g) => g.id)))
        return next
      })
      setDragId(null)
    },
    [dragId],
  )

  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(SECTION_COLLAPSED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <aside
      ref={setRefs}
      id="sidebar"
      style={width && !mobileOverlay ? { width: `${width}px` } : undefined}
      className={cn(
        'relative flex h-full w-56 shrink-0 flex-col border-border bg-panel/40',
        side === 'right' ? 'sidebar-right border-l' : 'border-r',
        hidden && !mobileOverlay && 'hidden',
        mobileOverlay &&
          'fixed inset-y-0 z-40 max-md:w-[min(18rem,85vw)] shadow-xl',
        mobileOverlay && (side === 'right' ? 'right-0' : 'left-0'),
      )}
    >
      {!mobileOverlay ? (
        <div
          id="sidebar-resize-handle"
          className={cn('sidebar-resize-handle', side === 'right' && 'sidebar-resize-handle-right')}
          aria-hidden
        />
      ) : null}

      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <svg className="h-6 w-6 text-primary" viewBox="0 0 32 32" aria-hidden>
          <path d="M16 4L16 22L6 22Z" fill="currentColor" />
          <path d="M16 8L16 22L24 22Z" fill="currentColor" opacity="0.6" />
          <path
            d="M4 24Q10 20 16 24Q22 28 28 24"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-sm font-semibold tracking-tight">Odysseus</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4" aria-label="Main navigation">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            isNavVisible(item.to, visibility),
          )
          if (visibleItems.length === 0) return null
          const isCollapsed = !!collapsed[group.id]
          return (
            <div
              key={group.id}
              id={group.id}
              draggable={dragEnabled}
              onDragStart={onDragStart(group.id)}
              onDragOver={onDragOver}
              onDrop={onDrop(group.id)}
              className={cn(
                'section group/section',
                dragId === group.id && 'opacity-60',
                isCollapsed && 'collapsed',
              )}
            >
              <div className="section-header-flex mb-1 flex items-center gap-1 px-3">
                {dragEnabled ? (
                  <span
                    className="drag-handle cursor-grab text-muted opacity-0 group-hover/section:opacity-100"
                    aria-hidden
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                ) : null}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => toggleSection(group.id)}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {group.title}
                  </p>
                </button>
                <button
                  type="button"
                  className="section-collapse-btn"
                  title={isCollapsed ? 'Expand section' : 'Collapse section'}
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleSection(group.id)}
                >
                  <ChevronDown className="section-collapse-chevron h-3 w-3" aria-hidden />
                </button>
              </div>
              <ul className="sidebar-section-nav space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavItemLink item={item} notesBadge={notesBadge} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-border p-2">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'density-compact-tight flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-panel text-foreground font-medium'
                : 'text-muted hover:bg-panel hover:text-foreground',
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          Settings
        </NavLink>
      </div>
    </aside>
  )
})
