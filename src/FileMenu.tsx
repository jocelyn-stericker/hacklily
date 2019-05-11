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

import { Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React from "react";

import { Auth } from "./auth";

interface Props {
  auth: Auth | null;
  canCreateNew: boolean;
  canExport: boolean;
  canSave: boolean;
  canSaveAs: boolean;
  songURL: string | null;
  colourScheme: "vs-dark" | "vs";
  onExportLy(): any;
  onExportMIDI(): any;
  onExportPDF(): any;
  onDeleteSong(song: string): void;
  onLoadSong(song: string): void;
  onShowAbout(): void;
  onShowClone(): void;
  onShowOpen(): void;
  onShowNew(): void;
  onShowPublish(): void;
  onSignIn(): void;
  onSignOut(): void;
  setColourScheme(colourScheme: "vs-dark" | "vs"): void;
}

/**
 * Renders the File menu.
 * The menu button is rendered by <Header />
 */
export default class FileMenu extends React.PureComponent<Props> {
  render(): JSX.Element {
    const {
      auth,
      canCreateNew,
      canExport,
      canSave,
      canSaveAs,
      onSignOut,
      onShowAbout,
      onShowClone,
      onShowOpen,
      onExportLy,
      onExportMIDI,
      onExportPDF,
      onShowNew,
      onShowPublish,
      songURL,
    } = this.props;

    let signOut: React.ReactNode;
    if (auth) {
      signOut = <MenuItem onClick={onSignOut} icon="log-out" text="Sign out" />;
    }

    // tslint:disable:no-http-string because of silly lilypond
    const tutorial: React.ReactNode = (
      <MenuItem
        href="http://lilypond.org/doc/v2.18/Documentation/learning/index"
        rel="noopener noreferrer"
        target="_blank"
        text="LilyPond manual&hellip;"
        icon="help"
      />
    );
    // tslint:enable:no-http-string because of silly lilypond

    const about: React.ReactNode = (
      <MenuItem onClick={onShowAbout} text="About Hacklily" icon="info-sign" />
    );

    return (
      <Menu>
        <MenuItem
          icon="add"
          text="New song"
          // label="&#8984;N"
          onClick={onShowNew}
          disabled={!canCreateNew}
        />
        <MenuDivider />
        <MenuItem
          icon="document-open"
          text="Open&hellip;"
          // label="&#8984;O"
          onClick={onShowOpen}
        />
        <MenuItem
          icon="floppy-disk"
          text="Save"
          // label="&#8984;S"
          disabled={!canSave}
          onClick={onShowPublish}
        />
        <MenuItem
          icon="duplicate"
          text="Save as&hellip;"
          onClick={onShowClone}
          disabled={!canSaveAs}
        />
        <MenuItem icon="download" text="Export" disabled={!canExport}>
          <MenuItem onClick={onExportLy} icon="code" text="LilyPond source" />
          <MenuItem onClick={onExportPDF} icon="document-share" text="PDF" />
          <MenuItem onClick={onExportMIDI} icon="music" text="MIDI" />
          {songURL && <MenuDivider />}
          {songURL && (
            <MenuItem
              href={songURL.replace(/\.ly$/, ".pdf")}
              icon="git-repo"
              text="View on GitHub"
            />
          )}
        </MenuItem>
        <MenuDivider />
        {this.renderSetColourScheme()}
        {signOut}
        <MenuDivider />
        {tutorial}
        {about}
      </Menu>
    );
  }

  private handleColourSchemeToggled = (): void => {
    const newColourScheme: "vs-dark" | "vs" =
      this.props.colourScheme === "vs-dark" ? "vs" : "vs-dark";

    this.props.setColourScheme(newColourScheme);
  };

  private renderSetColourScheme(): React.ReactNode {
    const text: string =
      this.props.colourScheme === "vs-dark"
        ? "Use light colour scheme"
        : "Use dark colour scheme";

    return (
      <MenuItem
        onClick={this.handleColourSchemeToggled}
        icon="lightbulb"
        text={text}
      />
    );
  }
}
