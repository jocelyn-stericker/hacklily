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

import { Button, Classes, Dialog, Intent } from "@blueprintjs/core";
import React from "react";

interface Props {
  resolveGitHub(): void;
  resolveLocalStorage(): void;
}

/**
 * This is shown when you load a song that was loaded dirty and has been edited elsewhere.
 */
export default class ModalConflict extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <Dialog isOpen={true} title="Keep unsaved changes?" icon="git-merge">
        <div className={Classes.DIALOG_BODY}>
          <p style={{ marginTop: 0 }}>
            <strong>This song was edited outside of this browser.</strong> You
            can either keep the unsaved version from this browser, or revert to
            the saved version.
          </p>
          <p>
            <strong>Tip: </strong> Next time, save songs before closing
            Hacklily.
          </p>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              onClick={this.props.resolveLocalStorage}
              intent={Intent.WARNING}
            >
              Keep unsaved version
            </Button>
            <Button onClick={this.props.resolveGitHub} intent={Intent.DANGER}>
              Revert to saved version
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }
}
