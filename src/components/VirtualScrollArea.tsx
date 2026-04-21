import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { assertUnreachable, cn } from '#/lib/utils'

export interface Props extends Omit<
  React.ComponentProps<'div'>,
  'onScroll' | 'onClick'
> {
  scrollX: number
  virtualWidth: number
  onZoom: (xPercentage: number, amount: number) => void
  onScrollX: (x: number) => void
  onClick: (x: number) => void
  onHover: (x: number | null) => void
  debug?: boolean
}

export function VirtualScrollArea({
  scrollX,
  onZoom,
  onScrollX,
  virtualWidth,
  onClick,
  onHover,
  debug = false,
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

          onZoom(p, ev.deltaY)
        }
      }
      root.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        root.removeEventListener('wheel', handleWheel)
      }
    }
  }, [onZoom, root])

  const pointerDistance = useCallback(
    (
      newPointers: Array<{
        initialX: number
        initialY: number
        currentX: number
        currentY: number
      }>,
    ) => {
      if (!newPointers[0] || !newPointers[1] || newPointers[2]) {
        return null
      }
      const origDistance = Math.sqrt(
        (newPointers[0].initialX - newPointers[1].initialX) ** 2 +
          (newPointers[0].initialY - newPointers[1].initialY) ** 2,
      )
      const newDistance = Math.sqrt(
        (newPointers[0].currentX - newPointers[1].currentX) ** 2 +
          (newPointers[0].currentY - newPointers[1].currentY) ** 2,
      )

      return origDistance - newDistance
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

      if (prevZoomDistance.current != null) {
        onZoom(p, (distance - prevZoomDistance.current) * 3.5)
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
      if (!root) {
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
        mouseDown
          ? 'cursor-grabbing overflow-x-hidden'
          : 'cursor-pointer overflow-x-scroll',
        'touch-pan-x overscroll-none absolute',
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
