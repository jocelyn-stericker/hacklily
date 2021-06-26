/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
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

import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import React from "react";

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
export default class ModalUnsavedChangesInterstitial extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <Dialog title="Unsaved changes" isOpen={true} onClose={this.props.cancel}>
        <div className={Classes.DIALOG_BODY}>
          <p className={Classes.TEXT_LARGE}>
            Your changes have not been saved.
          </p>
          <p>
            If you do not save your changes, they will be{" "}
            <strong>permanently lost</strong>!
          </p>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <div>
              <Button onClick={this.props.cancel}>Cancel</Button>
              <Button
                intent={Intent.DANGER}
                onClick={this.props.discardChanges}
                icon="trash"
              >
                Discard changes
              </Button>
              <Button
                icon="floppy-disk"
                intent={Intent.PRIMARY}
                onClick={this.props.save}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }
}
