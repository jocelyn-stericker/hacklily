/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

const ENABLE_STRICT_MODE = false

hydrateRoot(
  document,
  ENABLE_STRICT_MODE ? (
    <StrictMode>
      <StartClient />
    </StrictMode>
  ) : (
    <StartClient />
  ),
)
