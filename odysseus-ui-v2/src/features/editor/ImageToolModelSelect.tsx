import { useMemo } from 'react'
import { useEndpoints } from '@/hooks/useEndpoints'
import { buildImageModelOptions } from '@/lib/editor/imageModelCaps'

type ImageToolModelSelectProps = {
  tool: 'inpaint' | 'img2img'
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
}

export function ImageToolModelSelect({
  tool,
  value,
  onChange,
  className,
  id,
}: ImageToolModelSelectProps) {
  const { endpoints } = useEndpoints()
  const options = useMemo(
    () => buildImageModelOptions(endpoints, tool === 'inpaint' ? 'inpaint' : 'img2img'),
    [endpoints, tool],
  )

  return (
    <select
      id={id}
      className={className ?? 'h-8 w-full rounded-md border border-border bg-panel px-2 text-xs'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`${tool} model`}
    >
      <option value="">Auto</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
