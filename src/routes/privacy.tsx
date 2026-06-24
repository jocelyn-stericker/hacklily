// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

// Privacy & analytics disclosure. The stats it describes are public, so this
// page links straight to the live dashboard.

import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/privacy')({
  component: Privacy,
})

const DASHBOARD_URL = 'https://stats.braat.app/'

function Privacy() {
  useEffect(() => {
    document.title = 'Privacy · Braat'
  }, [])

  return (
    // #root is locked to 100dvh with overflow hidden (app-shell styling), so
    // this content page needs its own full-height scroll container.
    <main className="h-dvh overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Braat
        </Link>

        <div className="mt-6 space-y-6 text-sm leading-relaxed *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
            <p className="text-muted-foreground">
              Braat runs in your browser. It records and analyses your audio
              entirely on your device, and Braat itself never uploads it. There
              is one opt-in exception &mdash; speech-to-text &mdash; described
              below.
            </p>
          </header>

          <section className="space-y-2">
            <h2 className="text-base font-medium">Speech-to-text</h2>
            <p className="text-muted-foreground">
              Transcription is off unless you turn it on, and you choose the
              engine. The on-device engines keep your audio in the browser
              &mdash; nothing leaves your device. The one exception is the{' '}
              <strong className="font-medium text-foreground">
                &ldquo;Cloud transcription&rdquo;
              </strong>{' '}
              option, which sends your audio to your browser or operating
              system&rsquo;s speech service to transcribe it, subject to{' '}
              <em>that vendor&rsquo;s</em> privacy policy and outside
              Braat&rsquo;s control. It&rsquo;s labelled as such in the
              transcription settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium">Anonymous usage stats</h2>
            <p className="text-muted-foreground">
              To get a rough sense of whether Braat is useful and which parts
              get used, the site records anonymous, aggregate usage with{' '}
              <a
                href="https://www.goatcounter.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                GoatCounter
              </a>
              , a privacy-focused, open-source analytics tool. It sets{' '}
              <strong className="font-medium text-foreground">
                no cookies and stores no identifiers on your device
              </strong>
              , so there&rsquo;s nothing to consent to and no banner to dismiss.
              (Braat itself does store a few things locally &mdash; see below.)
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium">What is collected</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Which page you visit (e.g. the analyzer, practice, or IPA tool).
              </li>
              <li>
                A few interaction events &mdash; for example that a recording,
                playback, import, or export happened, or which practice options
                are in use (such as the chosen reference voice or text size)
                &mdash; but never their contents.
              </li>
              <li>
                Coarse technical details GoatCounter derives from the request:
                referring site, browser, screen size, and country.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium">What is not collected</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>No audio, and nothing derived from your voice.</li>
              <li>No tracking cookies and no device fingerprint.</li>
              <li>No cross-site tracking and no advertising.</li>
              <li>
                No stored IP addresses: GoatCounter discards them, deriving only
                a salted, daily-rotating hash to estimate unique visits.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium">
              What Braat stores on your device
            </h2>
            <p className="text-muted-foreground">
              So the app works well and offline, Braat keeps some data in your
              browser&rsquo;s own storage. None of it is sent anywhere:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Your settings and preferences.</li>
              <li>
                If you use transcription, the downloaded model files, plus an
                offline cache of the app itself.
              </li>
            </ul>
            <p className="text-muted-foreground">
              You can clear all of it at any time through your browser&rsquo;s
              site-data controls.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium">The numbers are public</h2>
            <p className="text-muted-foreground">
              In the spirit of the project, the stats are open for anyone to
              see:
            </p>
            <p>
              <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
                View the live dashboard &rarr;
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium">Opting out</h2>
            <p className="text-muted-foreground">
              Any content blocker that blocks GoatCounter will stop all of this.
              Braat does not act on the{' '}
              <a
                href="https://en.wikipedia.org/wiki/Do_Not_Track"
                target="_blank"
                rel="noopener noreferrer"
              >
                Do Not Track
              </a>{' '}
              or Global Privacy Control headers: they were meant to curb
              cross-site behavioural tracking, which this first-party,
              cookieless, anonymous count isn&rsquo;t &mdash; and so few
              browsers send them that honouring them would mostly make those
              visitors <em>more</em> identifiable, not less (
              <a
                href="https://www.arp242.net/dnt.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                reasoning
              </a>
              ).
            </p>
          </section>

          <footer className="border-t border-border pt-6 text-muted-foreground">
            <p>
              Braat is free software under the{' '}
              <a
                href="https://www.gnu.org/licenses/agpl-3.0.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                GNU AGPL v3
              </a>
              ; source on{' '}
              <a
                href="https://codeberg.org/jocelyn-stericker/braat"
                target="_blank"
                rel="noopener noreferrer"
              >
                Codeberg
              </a>
              . Questions? Email{' '}
              <a href="mailto:jocelyn@nettek.ca">jocelyn@nettek.ca</a>.
            </p>
          </footer>
        </div>
      </div>
    </main>
  )
}
