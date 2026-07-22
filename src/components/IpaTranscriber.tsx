// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { Link } from '@tanstack/react-router'
import { Check, Copy } from 'lucide-react'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'

import { NavBar } from '#/components/NavBar'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { getESpeak } from '#/lib/ipa/espeak'
import type { ESpeakEngine } from '#/lib/ipa/espeak'
import { cn } from '#/lib/utils'

// Keep in sync with the <title> in ipa.html. The static HTML sets this on a
// direct load (no flash, visible to crawlers); this keeps it correct after a
// client-side navigation into the route, when the document head isn't reloaded.
const PAGE_TITLE = 'English to IPA — Phonetic Transcription · Braat'

const SAMPLE_TEXT =
  'When sunlight strikes raindrops in the air, they act as a prism and form a rainbow.'

// U+0361 COMBINING DOUBLE INVERTED BREVE -- ties the two halves of a
// multi-character phoneme together (e.g. aɪ -> a͡ɪ) when "Tie diphthongs" is on.
const TIE_CHAR = '͡'

type Voice = 'en' | 'en-us'

export function IpaTranscriber() {
  const [text, setText] = useState(SAMPLE_TEXT)
  const [voice, setVoice] = useState<Voice>('en-us')
  const [keepStress, setKeepStress] = useState(true)
  const [tie, setTie] = useState(false)

  // The engine is an emscripten Module instance: a large object graph with
  // cyclic references into WASM memory. Keep it in local state and read it here,
  // but never pass it across a component boundary as a prop -- React's dev-mode
  // traversal of props recurses through the whole graph and hangs the tab. Pass
  // derived primitives (e.g. `engineLoading`) to children instead.
  const [engine, setEngine] = useState<ESpeakEngine | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    document.title = PAGE_TITLE
  }, [])

  useEffect(() => {
    let cancelled = false
    getESpeak().then(
      (e) => {
        if (!cancelled) setEngine(e)
      },
      (err: unknown) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : String(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const ipa = useMemo(() => {
    if (!engine) return ''
    let ret: string
    const tieRes = tie ? TIE_CHAR : undefined
    try {
      ret = engine.textToIPA(text, {
        voice,
        keepStress,
        tie: tieRes,
      })
    } catch (err) {
      ret = err instanceof Error ? `Error: ${err.message}` : 'Error'
    }
    return ret
  }, [engine, text, voice, keepStress, tie])

  return (
    <main className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      <NavBar />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
          <header>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              English to IPA
            </h1>
            <p className="mt-3 text-muted-foreground">
              Convert English text to its International Phonetic Alphabet (IPA)
              transcription. The conversion runs entirely in your browser using
              a WebAssembly build of{' '}
              <a
                href="https://github.com/espeak-ng/espeak-ng"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground"
              >
                eSpeak NG
              </a>
              — nothing you type is sent to a server.
            </p>
          </header>

          <section className="mt-8" aria-label="Transcriber">
            <Label htmlFor="ipa-input" className="mb-2">
              English text
            </Label>
            <textarea
              id="ipa-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="Type or paste English text…"
              className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div
                role="group"
                aria-label="Accent"
                className="inline-flex overflow-hidden rounded-lg border border-input"
              >
                <AccentButton
                  active={voice === 'en'}
                  onClick={() => setVoice('en')}
                >
                  British (en)
                </AccentButton>
                <AccentButton
                  active={voice === 'en-us'}
                  onClick={() => setVoice('en-us')}
                >
                  American (en-us)
                </AccentButton>
              </div>

              <Label className="gap-2">
                <Switch checked={keepStress} onCheckedChange={setKeepStress} />
                Stress marks
              </Label>

              <Label className="gap-2">
                <Switch checked={tie} onCheckedChange={setTie} />
                Tie diphthongs
              </Label>
            </div>

            <Label htmlFor="ipa-output" className="mt-6 mb-2">
              IPA transcription
            </Label>
            <Output ipa={ipa} engineLoading={!engine} loadError={loadError} />
          </section>

          <section className="mt-14 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div>
              <h2 className="font-heading text-lg font-medium text-foreground">
                What is IPA?
              </h2>
              <p className="mt-2">
                The International Phonetic Alphabet is a standard set of symbols
                for representing the sounds of spoken language. Each symbol maps
                to a specific sound, so a word’s pronunciation can be written
                down unambiguously regardless of its spelling — useful for
                language learning, linguistics, singing, and accent work.
              </p>
            </div>
            <div>
              <h2 className="font-heading text-lg font-medium text-foreground">
                How this works
              </h2>
              <p className="mt-2">
                English spelling doesn’t map cleanly to pronunciation, so this
                tool uses eSpeak NG’s pronunciation rules and dictionary to turn
                text into phonemes, then renders them as IPA. Stress marks (
                <span className="font-mono">ˈ ˌ</span>) can be kept or dropped,
                and diphthongs can be tied with a{' '}
                <span className="font-mono">◌͡◌</span> if you prefer that
                notation. The output is a phonemic transcription and may differ
                from a careful hand transcription in some cases.
              </p>
            </div>
            <div>
              <h2 className="font-heading text-lg font-medium text-foreground">
                Privacy
              </h2>
              <p className="mt-2">Text you enter is not uploaded anywhere.</p>
            </div>
          </section>

          <footer className="mt-14 space-y-1 border-t border-border pt-6 text-xs text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
            <p>
              Part of <Link to="/">Braat</Link>, free software released under
              the{' '}
              <a
                href="https://www.gnu.org/licenses/agpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                GNU AGPL v3 or (at your option) any later version
              </a>
              . Braat source code on{' '}
              <a
                href="https://slop.nettek.ca/jocelyn-stericker/braat"
                target="_blank"
                rel="noopener noreferrer"
              >
                Forgejo
              </a>
              . My lightweight phoneme library/eSpeak NG node module is also{' '}
              <a
                href="https://slop.nettek.ca/jocelyn-stericker/braat/src/branch/main/vendor/espeak-phonemes"
                target="_blank"
                rel="noopener noreferrer"
              >
                freely available
              </a>
              .
            </p>
            <p>
              Made by Jocelyn Stericker &lt;
              <a href="mailto:jocelyn@nettek.ca">jocelyn@nettek.ca</a>&gt;
            </p>
          </footer>
        </div>
      </div>
    </main>
  )
}

function AccentButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-transparent hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

function Output({
  ipa,
  engineLoading,
  loadError,
}: {
  ipa: string
  engineLoading: boolean
  loadError: string | null
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const handleCopy = () => {
    if (!ipa) return
    navigator.clipboard.writeText(ipa).then(
      () => setCopied(true),
      () => {},
    )
  }

  let body: React.ReactNode
  if (loadError) {
    body = (
      <p className="text-destructive">
        Couldn’t load the phonemiser: {loadError}
      </p>
    )
  } else if (engineLoading) {
    body = <p className="text-muted-foreground">Loading phonemiser...</p>
  } else if (!ipa) {
    body = <p className="text-muted-foreground">Enter some text above.</p>
  } else {
    body = <p className="text-xl leading-relaxed wrap-anywhere">{ipa}</p>
  }

  return (
    <div className="relative rounded-lg border border-input bg-muted/30 px-3 py-3">
      <div id="ipa-output" className="min-h-14 pr-10 font-mono">
        {body}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        disabled={!ipa || engineLoading || loadError !== null}
        title="Copy IPA"
        aria-label="Copy IPA"
        className="absolute top-2 right-2"
      >
        {copied ? <Check className="text-primary" /> : <Copy />}
      </Button>
    </div>
  )
}
