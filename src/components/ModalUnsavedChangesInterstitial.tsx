/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

import { Save, Trash } from "lucide-react";
import React from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

interface Props {
  cancel(): void;
  discardChanges(): void;
  save(): void;
}

/**
 * This is the "Do you want to save your changes" modal you get when you load a song
 * while the current one has unsaved changes in the current song.
 *
 * Now, we could instead just redirect the user, since we do store the code for
 * ALL songs that are dirty in localStorage, but that may result in the user being
 * confused when she or he tries editing the song somewhere else and isn't sure where
 * the source went. Multiple sources of truth are bad in this case. So we leave this
 * feature only for the case when the tab is closed without saving. In no case will
 * the page change while leaving dirty state for the old song.
 *
 * This modal requests to be closed by calling one of the three callbacks.
 */
const ModalUnsavedChangesInterstitial: React.FC<Props> = React.memo(
  function ModalUnsavedChangesInterstitial(props) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && props.cancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-lg">Your changes have not been saved.</p>
            <p>
              If you do not save your changes, they will be{" "}
              <strong>permanently lost</strong>!
            </p>
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button onClick={props.cancel} variant="outline">
                Cancel
              </Button>
              <Button variant="destructive" onClick={props.discardChanges}>
                <Trash size="1em" />
                Discard changes
              </Button>
              <Button variant="default" onClick={props.save}>
                <Save size="1em" />
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

export default ModalUnsavedChangesInterstitial;
