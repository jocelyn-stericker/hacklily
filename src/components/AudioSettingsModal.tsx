/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useSettings, updateSettings } from '#/lib/settings'
import type {
  SettingsRow,
  BrowserPreprocessing,
  SampleRatePref,
} from '#/lib/settings'

function isDesktopLinux(): boolean {
  if (typeof navigator === 'undefined') return false
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? ''
  if (platform === 'Linux') return true
  return (
    /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent)
  )
}

export function AudioSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settings: SettingsRow = useSettings()

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const linux = isDesktopLinux()

  useEffect(() => {
    if (!open) return
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === 'audioinput')))
      .catch(() => {})
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Audio settings</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-5 py-2">
            {/* Input device */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="input-device">Input device</Label>
              <Select
                value={settings.inputDeviceId ?? 'default'}
                onValueChange={(val) => {
                  if (val === (settings.inputDeviceId ?? 'default')) return
                  void updateSettings({
                    inputDeviceId: val === 'default' ? null : val,
                  }).then(() => toast('Setting applied'))
                }}
              >
                <SelectTrigger id="input-device" className="w-full">
                  <SelectValue>
                    {(v: string | null) =>
                      !v || v === 'default'
                        ? 'Default device'
                        : devices.find((d) => d.deviceId === v)?.label ||
                          `Microphone ${v.slice(0, 8)}`
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default device</SelectItem>
                  {devices.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {devices.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Grant microphone permission to see available devices.
                </p>
              )}
            </div>

            {/* Sample rate */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sample-rate">Sample rate</Label>
              <Select
                value={settings.sampleRate}
                onValueChange={(val) => {
                  if (val === settings.sampleRate) return
                  void updateSettings({
                    sampleRate: val as SampleRatePref,
                  }).then(() => toast('Setting applied'))
                }}
              >
                <SelectTrigger id="sample-rate" className="w-full">
                  <SelectValue>
                    {(v: string | null) =>
                      v === 'prefer48000'
                        ? 'Prefer 48000 Hz'
                        : v === 'prefer44100'
                          ? 'Prefer 44100 Hz'
                          : 'Automatic'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic</SelectItem>
                  <SelectItem value="prefer48000">Prefer 48000 Hz</SelectItem>
                  <SelectItem value="prefer44100">Prefer 44100 Hz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Persistent mic */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="persistent-mic">
                Microphone connection (advanced)
              </Label>
              <Select
                value={settings.persistentMic ? 'persistent' : 'on-demand'}
                onValueChange={(val) => {
                  if (
                    val ===
                    (settings.persistentMic ? 'persistent' : 'on-demand')
                  )
                    return
                  void updateSettings({
                    persistentMic: val === 'persistent',
                  }).then(() => toast('Setting applied'))
                }}
              >
                <SelectTrigger id="persistent-mic" className="w-full">
                  <SelectValue>
                    {(v: string | null) =>
                      v === 'persistent' ? 'Keep open' : 'While recording only'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-demand">
                    While recording only
                  </SelectItem>
                  <SelectItem value="persistent">Keep open</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                &ldquo;Keep open&rdquo; reduces the delay when starting a
                recording and avoids dropouts at the start of a recording.{' '}
                {linux && (
                  <span className="font-bold"> Recommended on Linux.</span>
                )}
              </p>
            </div>

            {/* Browser preprocessing */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="browser-preprocessing">
                Browser preprocessing (advanced)
              </Label>
              <Select
                value={settings.browserPreprocessing}
                onValueChange={(val) => {
                  if (val === settings.browserPreprocessing) return
                  void updateSettings({
                    browserPreprocessing: val as BrowserPreprocessing,
                  }).then(() => toast('Setting applied'))
                }}
              >
                <SelectTrigger id="browser-preprocessing" className="w-full">
                  <SelectValue>
                    {(v: string | null) =>
                      v === 'minimal' ? 'Prefer minimal processing' : 'Default'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="minimal">
                    Prefer minimal processing
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                &ldquo;Prefer minimal processing&rdquo; tells the browser to
                skip echo cancellation, noise suppression, and auto gain
                control.
              </p>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
