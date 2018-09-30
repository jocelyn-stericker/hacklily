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

import { ModalLauncher } from "@khanacademy/wonder-blocks-modal";
import React from "react";

interface Props {
  children: React.ReactNode;
  onClose: () => void;
}

export default class Modal extends React.Component<Props> {
  openModal?: () => void;

  componentDidMount() {
    if (this.openModal) {
      this.openModal();
    }
  }

  render() {
    return (
      <ModalLauncher modal={this.props.children} onClose={this.props.onClose}>
        {({ openModal }: { openModal: () => void }) => {
          this.openModal = openModal;

          return null;
        }}
      </ModalLauncher>
    );
  }
}
