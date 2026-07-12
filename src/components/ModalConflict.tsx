// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

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
