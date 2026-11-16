import { ref } from 'vue'

export interface ResizableOptions {
  side: 'left' | 'right'
  min: number
  max: () => number
  initial: number | (() => number)
  onUpdate: (width: number) => void
  onCommit: (width: number) => void
  onReset: () => void
}

export function useResizable(options: ResizableOptions) {
  const isDragging = ref(false)
  let startX = 0
  let startWidth = 0
  let currentWidth = 0
  let rafId: number | null = null

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    isDragging.value = true
    startX = e.clientX
    startWidth = typeof options.initial === 'function' ? options.initial() : options.initial
    currentWidth = startWidth
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return
    const dx = options.side === 'left' ? e.clientX - startX : startX - e.clientX
    const maxVal = options.max()
    const nextWidth = Math.max(options.min, Math.min(maxVal, startWidth + dx))
    currentWidth = nextWidth

    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      options.onUpdate(currentWidth)
      rafId = null
    })
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging.value) return
    const target = e.currentTarget as HTMLElement
    try {
      target.releasePointerCapture(e.pointerId)
    } catch {
      // Abaikan jika pointer capture telah terlepas
    }
    isDragging.value = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    options.onCommit(currentWidth)
  }

  function onDoubleClick() {
    options.onReset()
  }

  return {
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
  }
}
