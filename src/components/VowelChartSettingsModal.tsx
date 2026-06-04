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
import { useSettings } from '#/components/useSettings'
import type { VowelChartAverages } from '#/lib/settings'

import { VowelChart } from './VowelChart'

const LOG = '[VowelChartSettings]'

export function VowelChartSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [settings, updateSettings] = useSettings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vowel chart settings</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vowel-averages">Reference formants</Label>
              <Select
                value={settings.vowelChartAverages}
                onValueChange={(val) => {
                  if (val === settings.vowelChartAverages) return
                  updateSettings({
                    vowelChartAverages: val as VowelChartAverages,
                  })
                    .then(() => toast('Saved'))
                    .catch((err) => {
                      console.error(
                        LOG,
                        'failed to save vowel chart averages:',
                        err,
                      )
                      toast('Couldn’t save setting')
                    })
                }}
              >
                <SelectTrigger id="vowel-averages" className="w-full">
                  <SelectValue>
                    {(v: string | null) => {
                      switch (v) {
                        case 'women':
                          return 'Women'
                        case 'men':
                          return 'Men'
                        case 'adults':
                          return 'All adults'
                        case 'children':
                          return 'Children'
                        default:
                          return 'Hidden'
                      }
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="adults">All adults</SelectItem>
                  <SelectItem value="children">Children</SelectItem>
                </SelectContent>
              </Select>
              <VowelChart cursorSec={0} analysisMut={[]} />
              <p className="text-xs text-muted-foreground">
                When set, the chart overlays reference American English vowel
                formants (Hillenbrand et al., 1995) for the chosen group as you
                hover over the spectrogram — useful if you're working toward
                specific target vowels, as in accent modification or trans voice
                training.
              </p>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
