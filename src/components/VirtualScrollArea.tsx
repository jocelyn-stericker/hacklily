// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { assertUnreachable, cn } from '#/lib/utils'

// Larger = faster wheel zoom. Tuned so a typical trackpad/mouse notch is a
// gentle step regardless of device.
const WHEEL_ZOOM_SENSITIVITY = 0.002
// Cap a single wheel event so high-resolution wheels and momentum flings can't
// jump the zoom; this is what keeps feel consistent across devices.
const MAX_WHEEL_DELTA_PX = 80

/**
 * Convert a wheel event into a multiplicative zoom factor (> 1 zooms out, < 1
 * zooms in). Normalizes `deltaMode` to pixels and clamps the magnitude so the
 * step feels the same whether deltaY arrives in lines (classic mice) or pixels
 * (trackpads / high-res wheels).
 */
function wheelZoomFactor(ev: WheelEvent, root: HTMLElement) {
  let dy = ev.deltaY
  if (ev.deltaMode === 1) {
    dy *= 16 // DOM_DELTA_LINE -> approximate line height in px
  } else if (ev.deltaMode === 2) {
    dy *= root.clientHeight // DOM_DELTA_PAGE -> one viewport
  }
  dy = Math.max(-MAX_WHEEL_DELTA_PX, Math.min(MAX_WHEEL_DELTA_PX, dy))
  return Math.exp(dy * WHEEL_ZOOM_SENSITIVITY)
}

export interface Props extends Omit<
  React.ComponentProps<'div'>,
  'onScroll' | 'onClick'
> {
  scrollX: number
  virtualWidth: number
  /** `factor` scales the visible span: > 1 zooms out, < 1 zooms in. */
  onZoom: (xPercentage: number, factor: number) => void
  onScrollX: (x: number) => void
  onClick: (x: number) => void
  onHover: (x: number | null) => void
  debug?: boolean
  hideScrollBar?: boolean
}

/**
 * VirtualScrollArea` is the primary interaction surface -- it handles scroll, zoom,
 * and all pointer events. Domain visualizations (`Waveform`, `Spectrogram`,
 * `VowelChart`) render inside it.
 */
export function VirtualScrollArea({
  scrollX,
  onZoom,
  onScrollX,
  virtualWidth,
  onClick,
  onHover,
  debug = false,
  hideScrollBar = false,
  ...rest
}: Props) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<
    'panning' | 'scrolling' | 'programmatic' | 'zooming'
  >('programmatic')
  const [mouseDown, setMouseDown] = useState<{
    initialScrollX: number
    initialMouseX: number
  } | null>(null)
  const [pointers, setPointers] = useState<
    Array<{
      initialX: number
      initialY: number
      currentX: number
      currentY: number
      id: number
    }>
  >([])
  const prevZoomDistance = useRef<number>(null)
  const prevScrollX = useRef<number>(null)
  const pendingAction = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    if (root) {
      if (mode === 'scrolling') {
        clearModeTimeout()
        pendingAction.current = setTimeout(() => {
          setMode('programmatic')
        }, 100)
      } else {
        prevScrollX.current = scrollX
        root.scrollTo({ left: scrollX, top: 0, behavior: 'instant' })
      }
    }
  }, [mode, root, scrollX])

  useEffect(() => {
    if (root) {
      // React has passive event handlers, so we can't block page scrolling via prop!
      const handleWheel = (ev: WheelEvent) => {
        if (ev.deltaY && !ev.deltaX && !ev.shiftKey && !ev.altKey) {
          ev.preventDefault()
          ev.stopPropagation()
          setMode('zooming')

          const boundingRect = root.getBoundingClientRect()
          const x = ev.clientX - boundingRect.x
          // Between 0 and 1, where the mouse is horizontally. This does not
          // change while zooming.
          const p = x / boundingRect.width
          clearModeTimeout()
          pendingAction.current = setTimeout(() => {
            setMode('programmatic')
          }, 100)

          onZoom(p, wheelZoomFactor(ev, root))
        }
      }
      root.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        root.removeEventListener('wheel', handleWheel)
      }
    }
  }, [onZoom, root])

  // Current Euclidean separation between the two active pointers, or null unless
  // exactly two are down. Used as a ratio between frames so pinch zoom is
  // independent of screen size/DPI.
  const pointerDistance = useCallback(
    (
      newPointers: Array<{
        currentX: number
        currentY: number
      }>,
    ) => {
      if (!newPointers[0] || !newPointers[1] || newPointers[2]) {
        return null
      }
      return Math.sqrt(
        (newPointers[0].currentX - newPointers[1].currentX) ** 2 +
          (newPointers[0].currentY - newPointers[1].currentY) ** 2,
      )
    },
    [],
  )

  const handlePointerDown = useCallback(
    (ev: React.PointerEvent<HTMLElement>) => {
      if (!root) {
        return
      }

      const boundingRect = root.getBoundingClientRect()
      setPointers((oldPointers) => {
        if (oldPointers.length >= 1) {
          clearModeTimeout()
          setMode('zooming')
        }
        const x = ev.clientX - boundingRect.x
        const y = ev.clientY - boundingRect.y
        const newPointers = [
          ...oldPointers,
          {
            initialX: x,
            currentX: x,
            id: ev.pointerId,
            initialY: y,
            currentY: y,
          },
        ]
        prevZoomDistance.current = pointerDistance(newPointers)
        return newPointers
      })
    },
    [pointerDistance, root],
  )
  const handlePointerMove = useCallback(
    (ev: React.PointerEvent<HTMLElement>) => {
      const pointer = pointers.find((p) => p.id === ev.pointerId)
      if (!pointer || !root) {
        return
      }

      const boundingRect = root.getBoundingClientRect()
      const x = ev.clientX - boundingRect.x
      const y = ev.clientY - boundingRect.y
      pointer.currentX = x
      pointer.currentY = y

      if (!pointers[0] || !pointers[1] || pointers[2]) {
        return
      }
      const distance = pointerDistance(pointers)
      if (!distance) {
        return
      }

      const p =
        (pointers[0].currentX + pointers[1].currentX) / 2 / boundingRect.width

      if (prevZoomDistance.current != null && prevZoomDistance.current > 0) {
        // Spreading the fingers grows `distance`, shrinking the span (zoom in).
        onZoom(p, prevZoomDistance.current / distance)
      }
      prevZoomDistance.current = distance

      ev.preventDefault()
    },
    [onZoom, pointerDistance, pointers, root],
  )

  const handlePointerUp = useCallback(
    (ev: React.PointerEvent<HTMLElement>) => {
      if (!root) {
        return
      }

      setPointers((oldPointers) => {
        const newPointers = oldPointers.filter(
          (pointer) => pointer.id !== ev.pointerId,
        )
        if (!newPointers.length) {
          clearModeTimeout()
          setMode('programmatic')
        }

        return newPointers
      })
    },
    [root],
  )

  const handleMouseMove = useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (!root) {
        return
      }
      if (mouseDown) {
        const boundingRect = root.getBoundingClientRect()
        const x = ev.clientX - boundingRect.x
        onScrollX(
          Math.min(
            Math.max(0, mouseDown.initialScrollX + mouseDown.initialMouseX - x),
            virtualWidth,
          ),
        )
        onHover(null)
      } else {
        const boundingRect = root.getBoundingClientRect()
        const x = ev.clientX - boundingRect.x + root.scrollLeft

        onHover(x)
      }
    },
    [mouseDown, onHover, onScrollX, root, virtualWidth],
  )

  const handleMouseOut = useCallback(
    (_ev: React.MouseEvent<HTMLElement>) => {
      onHover(null)
    },
    [onHover],
  )

  const isDrag = useRef(false)

  const handleMouseUp = useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (!root) {
        return
      }
      const boundingRect = root.getBoundingClientRect()
      const x = ev.clientX - boundingRect.x
      isDrag.current = Math.abs(x - (mouseDown?.initialMouseX ?? x)) > 5
      setMouseDown(null)
      clearModeTimeout()
      setMode('programmatic')
    },
    [mouseDown?.initialMouseX, root],
  )

  const handleMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (!root || ev.nativeEvent.offsetY >= ev.currentTarget.clientHeight) {
        return
      }
      const boundingRect = root.getBoundingClientRect()
      const x = ev.clientX - boundingRect.x

      setMouseDown({ initialScrollX: scrollX, initialMouseX: x })
      clearModeTimeout()
      setMode('panning')
    },
    [root, scrollX],
  )

  const handleScroll = useCallback(
    (ev: React.UIEvent<HTMLElement>) => {
      if (mode === 'zooming') {
        return
      }
      if (
        Math.abs(ev.currentTarget.scrollLeft - (prevScrollX.current ?? 0)) >=
        0.5
      ) {
        onScrollX(ev.currentTarget.scrollLeft)
        if (mode === 'programmatic') {
          setMode('scrolling')
        }
      }
    },
    [mode, onScrollX],
  )

  const handleClick = useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (!root || isDrag.current) {
        isDrag.current = false
        return
      }
      const boundingRect = root.getBoundingClientRect()
      const x = ev.clientX - boundingRect.x + root.scrollLeft

      onClick(x)
    },
    [onClick, root],
  )

  return (
    <div
      {...rest}
      className={cn(
        hideScrollBar
          ? 'cursor-default'
          : mouseDown
            ? 'cursor-grabbing'
            : 'cursor-pointer',
        hideScrollBar ? 'overflow-x-hidden' : 'overflow-x-scroll',
        'touch-pan-x overscroll-none absolute scrollbar-thin scrollbar-thumb-black dark:scrollbar-thumb-white scrollbar-track-transparent',
        rest.className,
      )}
      ref={setRoot}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerOut={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onScroll={handleScroll}
      onClick={handleClick}
    >
      <div
        style={{
          width: virtualWidth,
          height: 10,
          backgroundColor: getDebugColor(),
        }}
      />
    </div>
  )

  function clearModeTimeout() {
    if (pendingAction.current) {
      clearTimeout(pendingAction.current)
      pendingAction.current = null
    }
  }

  function getDebugColor() {
    if (!debug) {
      return undefined
    }

    switch (mode) {
      case 'zooming':
        return 'red'
      case 'programmatic':
        return 'green'
      case 'panning':
        return 'purple'
      case 'scrolling':
        return 'yellow'
      default:
        assertUnreachable(mode)
    }
  }
}
