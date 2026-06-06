import { useCallback, useRef } from 'react'

export interface ResizeHandleProps {
  /** `x` = drag left/right (col-resize), `y` = drag up/down (row-resize) */
  axis: 'x' | 'y'
  onDrag: (delta: number) => void
  onDragEnd?: () => void
}

export function ResizeHandle({ axis, onDrag, onDragEnd }: ResizeHandleProps): React.ReactElement {
  const lastRef = useRef(0)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)
      lastRef.current = axis === 'x' ? e.clientX : e.clientY

      const onMove = (ev: PointerEvent): void => {
        const cur = axis === 'x' ? ev.clientX : ev.clientY
        const delta = cur - lastRef.current
        lastRef.current = cur
        if (delta !== 0) onDrag(delta)
      }

      const onUp = (): void => {
        el.releasePointerCapture(e.pointerId)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        onDragEnd?.()
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [axis, onDrag, onDragEnd]
  )

  return (
    <div
      className={`resize-handle resize-handle-${axis}`}
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      onPointerDown={onPointerDown}
    />
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export { clamp }
