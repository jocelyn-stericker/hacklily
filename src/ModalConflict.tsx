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
  resolveGitHub(): void;
  resolveLocalStorage(): void;
}

/**
 * This is shown when you load a song that was loaded dirty and has been edited elsewhere.
 */
const ModalConflict: React.FC<Props> = React.memo(
  function ModalConflict(props) {
    return (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keep unsaved changes?</DialogTitle>
          </DialogHeader>
          <div>
            <p style={{ marginTop: 0 }}>
              <strong>This song was edited outside of this browser.</strong> You
              can either keep the unsaved version from this browser, or revert
              to the saved version.
            </p>
            <p>
              <strong>Tip: </strong> Next time, save songs before closing
              Hacklily.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={props.resolveLocalStorage} variant="secondary">
              Keep unsaved version
            </Button>
            <Button onClick={props.resolveGitHub} variant="destructive">
              Revert to saved version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

export default ModalConflict;
