// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute } from '@tanstack/react-router'

import { IpaTranscriber } from '#/components/IpaTranscriber'

export const Route = createFileRoute('/ipa')({
  component: IpaTranscriber,
})
