import { FolderOpen, MicVocal } from 'lucide-react'

import braatPng from '#/../public/braat.png'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

interface WelcomeModalProps {
  open: boolean
  onStartRecording: () => void
  onOpenFile: () => void
}

export function WelcomeModal({
  open,
  onStartRecording,
  onOpenFile,
}: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Welcome to Braat</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <img src={braatPng} className="h-12 bg-[#8ace00]" alt="Braat" />
          <div className="flex flex-col gap-2 w-full">
            <Button
              variant="default"
              className="w-full h-12 text-base gap-2 cursor-pointer"
              onClick={onStartRecording}
            >
              <MicVocal className="size-5" />
              Analyze from Microphone
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={onOpenFile}
            >
              <FolderOpen className="size-4" />
              Import Audio File
            </Button>
          </div>
        </div>
        <DialogDescription className="text-center text-xs space-y-2">
          <span className="block">
            Braat is a real-time spectrogram and formant tracker for voice
            training, based on algorithms stolen from{' '}
            <a
              href="https://www.fon.hum.uva.nl/praat/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Praat
            </a>
            . Audio is processed entirely in your browser.
          </span>
          <span className="block">
            This is free software, released under the{' '}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              GNU AGPL v3 or (at your option) any later version
            </a>{' '}
            &mdash; source code on{' '}
            <a
              href="https://codeberg.org/jocelyn-stericker/braat"
              target="_blank"
              rel="noopener noreferrer"
            >
              Codeberg
            </a>
            .
          </span>
          <span className="block">
            Made by Jocelyn Stericker {'<'}jocelyn@nettek.ca{'>'}{' '}
          </span>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}
