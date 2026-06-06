import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EditorTopbarMenusProps = {
  canvasWidth: number
  canvasHeight: number
  onResize: (w: number, h: number) => void
  onRotate: (deg: 90 | 180 | 270) => void
  onFlip: (axis: 'h' | 'v') => void
  onPaste: () => void
  onCopyMask: () => void
  onClearMask: () => void
}

const PRESETS = [
  { label: '800×600', w: 800, h: 600 },
  { label: '1024×768', w: 1024, h: 768 },
  { label: '1920×1080', w: 1920, h: 1080 },
  { label: '1080×1920', w: 1080, h: 1920 },
]

export function EditorTopbarMenus({
  canvasWidth,
  canvasHeight,
  onResize,
  onRotate,
  onFlip,
  onPaste,
  onCopyMask,
  onClearMask,
}: EditorTopbarMenusProps) {
  const [openMenu, setOpenMenu] = useState<'image' | 'edit' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const promptCustomSize = () => {
    const raw = window.prompt('Canvas size (W×H)', `${canvasWidth}×${canvasHeight}`)
    if (!raw) return
    const m = raw.match(/^(\d+)\s*[x×]\s*(\d+)$/i)
    if (!m) return
    onResize(Number(m[1]), Number(m[2]))
    setOpenMenu(null)
  }

  return (
    <div ref={rootRef} className="flex gap-1">
      <MenuButton
        label="Image"
        open={openMenu === 'image'}
        onToggle={() => setOpenMenu((m) => (m === 'image' ? null : 'image'))}
      >
        <MenuItem onClick={() => { onRotate(90); setOpenMenu(null) }}>Rotate 90° CW</MenuItem>
        <MenuItem onClick={() => { onRotate(180); setOpenMenu(null) }}>Rotate 180°</MenuItem>
        <MenuItem onClick={() => { onRotate(270); setOpenMenu(null) }}>Rotate 90° CCW</MenuItem>
        <MenuDivider />
        <MenuItem onClick={() => { onFlip('h'); setOpenMenu(null) }}>Flip horizontal</MenuItem>
        <MenuItem onClick={() => { onFlip('v'); setOpenMenu(null) }}>Flip vertical</MenuItem>
        <MenuDivider />
        <span className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted">Resize</span>
        {PRESETS.map((p) => (
          <MenuItem
            key={p.label}
            onClick={() => {
              onResize(p.w, p.h)
              setOpenMenu(null)
            }}
          >
            {p.label}
          </MenuItem>
        ))}
        <MenuItem onClick={promptCustomSize}>Custom size…</MenuItem>
      </MenuButton>

      <MenuButton
        label="Edit"
        open={openMenu === 'edit'}
        onToggle={() => setOpenMenu((m) => (m === 'edit' ? null : 'edit'))}
      >
        <MenuItem onClick={() => { void onPaste(); setOpenMenu(null) }}>Paste as layer</MenuItem>
        <MenuItem onClick={() => { onCopyMask(); setOpenMenu(null) }}>Copy mask</MenuItem>
        <MenuItem onClick={() => { onClearMask(); setOpenMenu(null) }}>Clear mask</MenuItem>
      </MenuButton>
    </div>
  )
}

function MenuButton({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={onToggle} className="gap-1">
        {label}
        <ChevronDown className={cn('h-3 w-3 transition', open && 'rotate-180')} />
      </Button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-md border border-border bg-panel py-1 shadow-md">
          {children}
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="block w-full px-3 py-1.5 text-left text-xs hover:bg-background"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-border" />
}
