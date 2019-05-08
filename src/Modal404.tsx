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
  onHide(): void;
}

/**
 * A 404 modal that is rendered when the 404 query is set.
 *
 * 404.html (which GitHub pages will render for every unmatched URL) redirects to
 * '/?404=1', which renders <App 404="1" />, which results in this modal being shown.
 */
export default class Modal404 extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <Dialog title="Page not found" isOpen={true} onClose={this.props.onHide}>
        <div className={Classes.DIALOG_BODY}>
          <p>The requested page may have been moved or deleted.</p>
          <p>
            Hacklily is a free online sheet-music editor and publishing tool.
            While you are here, why not give it a try?
          </p>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={this.props.onHide} intent={Intent.PRIMARY}>
              Continue
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }
}
