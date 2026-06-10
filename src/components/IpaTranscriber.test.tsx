// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>.

// @vitest-environment jsdom
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IpaTranscriber } from './IpaTranscriber'

const { getESpeak, textToIPA } = vi.hoisted(() => {
  const fn = vi.fn((text: string) => `ipa(${text})`)
  // Mirror the real eSpeak engine: a large object graph with a cyclic reference
  // (the emscripten Module). If this object is ever passed across a component
  // boundary as a prop, React's dev-mode traversal recurses through the cycle
  // and hangs -- this test would then time out. The component must only hand
  // derived primitives to children (see IpaTranscriber).
  const engine: Record<string, unknown> = { textToIPA: fn }
  engine.module = { engine, heap: new Array(1000).fill(0) }
  return { textToIPA: fn, getESpeak: vi.fn(() => Promise.resolve(engine)) }
})

vi.mock('#/lib/ipa/espeak', () => ({ getESpeak }))

afterEach(() => {
  vi.clearAllMocks()
})

function renderAtIpa() {
  const rootRoute = createRootRoute()
  const ipaRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/ipa',
    component: IpaTranscriber,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([ipaRoute]),
    history: createMemoryHistory({ initialEntries: ['/ipa'] }),
  })
  return render(<RouterProvider router={router} />)
}

describe('IpaTranscriber', () => {
  it('renders the transcription at /ipa without looping', async () => {
    renderAtIpa()

    await waitFor(() => {
      expect(
        screen.getByText(
          'ipa(When sunlight strikes raindrops in the air, they act as a prism and form a rainbow.)',
        ),
      ).toBeTruthy()
    })

    // A render loop would call the engine over and over; loading it is one-shot.
    expect(getESpeak).toHaveBeenCalledTimes(1)
    expect(textToIPA.mock.calls.length).toBeLessThan(10)
  })
})
