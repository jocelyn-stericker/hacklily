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

import React from 'react';

import { File, ls } from './gitfs';
import { Auth } from './ModalLogin';

class Connection extends React.Component {
    from;
    to;

    render() {
        if (this.props.to !== this.to || this.props.from !== this.from) {
            this.disconnect();
            this.from = this.props.from;
            this.to = this.props.to;
            this.connect();
        }

        return null;
    }

    componentWillUnmount() {
        this.disconnect();
    }

    disconnect() {
        if (this.from && this.to) {
            this.from.disconnect(this.to);
        }
    }

    connect() {
        if (this.from && this.to) {
            this.from.connect(this.to);
        }
    }
}

export default class StandaloneAppHost extends React.Component {
  props;

  resolvers = {};
  rejectors = {};

  render() {
    if (this.channel) {
      const {webContentsBridge, localFiles} = this.channel.objects;
      return (
        <noscript>
          <Connection from={webContentsBridge.onNewSong} to={this.props.onNewSong} />
          <Connection from={webContentsBridge.onOpen} to={this.props.onOpen} />
          <Connection from={webContentsBridge.onImport} to={this.props.onImport} />
          <Connection from={webContentsBridge.onImportRejected} to={this.props.onImportRejected} />
          <Connection from={webContentsBridge.onSave} to={this.props.onSave} />
          <Connection from={webContentsBridge.onFind} to={this.props.onFind} />
          <Connection from={webContentsBridge.onFindNext} to={this.props.onFindNext} />
          <Connection from={webContentsBridge.onViewMode} to={this.props.onViewMode} />
          <Connection from={webContentsBridge.onRequestImport} to={this.props.onRequestImport} />
          <Connection from={webContentsBridge.onSelectAll} to={this.props.onSelectAll} />
          <Connection from={webContentsBridge.onSplitMode} to={this.props.onSplitMode} />
          <Connection from={webContentsBridge.onCodeMode} to={this.props.onCodeMode} />
          <Connection from={webContentsBridge.onAboutHacklily} to={this.props.onAboutHacklily} />
          <Connection from={webContentsBridge.onExportRequested} to={this.props.onExportRequested} />
          <Connection from={webContentsBridge.unsavedChangesSave} to={this.props.onUnsavedChangesSave} />
          <Connection from={webContentsBridge.unsavedChangesCancel} to={this.props.onUnsavedChangesCancel} />
          <Connection from={webContentsBridge.unsavedChangesDiscard} to={this.props.onUnsavedChangesDiscard} />
          <Connection from={webContentsBridge.openCancel} to={this.props.onOpenCancel} />
          <Connection from={webContentsBridge.openFile} to={this.props.onOpenFile} />
          <Connection from={webContentsBridge.renderCompleted} to={this.handleRenderCompleted} />
          <Connection from={webContentsBridge.renderError} to={this.handleRenderError} />
          <Connection from={webContentsBridge.saveAsCancel} to={this.props.onSaveAsCancel} />
          <Connection from={webContentsBridge.saveAsFile} to={this.props.onSaveAsFile} />
          <Connection from={localFiles.pathChanged} to={this.props.onLocalFilesChanged} />
        </noscript>
      );
    }

    return null;

  }

  componentWillMount() {
    if (typeof QWebChannel === 'undefined') {
      // We only use this in the standalone app.
      return;
    }
    new QWebChannel(qt.webChannelTransport, (channel) => {
      this.channel = channel;
    });
  }

  get localFiles() {
    if (!this.channel) {
      return null;
    }
    return this.channel.objects.localFiles.contents;
  }

  componentWillUnmount() {
    if (this.channel) {
      this.channel = null;
    }
  }

  componentWillReceiveProps(newProps) {
    if (this.channel) {
      const {webContentsBridge} = this.channel.objects;
      if (newProps.showUnsavedChangesDialog !== this.props.showUnsavedChangesDialog) {
        webContentsBridge.unsavedChangesModalVisible = newProps.showUnsavedChangesDialog;
      }
      if (newProps.showOpenDialog !== this.props.showOpenDialog) {
        webContentsBridge.openDialogVisible = newProps.showOpenDialog;
        if (newProps.showOpenDialog) {
          this.fetchSongs();
        }
      }
      if (newProps.showSaveAs !== this.props.showSaveAs) {
        webContentsBridge.saveAsVisible = newProps.showSaveAs;
        if (this.props.showSaveAs) {
          this.fetchSongs(); // To check against files that already exist.
        }
      }
      if (newProps.showImport !== this.props.showImport) {
        webContentsBridge.importVisible = newProps.showImport;
      }
      if (newProps.showSaving !== this.props.showSaving) {
        webContentsBridge.savingVisible = newProps.showSaving;
      }
    }
  }

  fetchSongs = async () => {
    const { auth } = this.props;
    if (auth) {
      try {
        const repoTree = await ls(auth.accessToken, auth.repo);
        if (this.channel) {
          this.channel.objects.webContentsBridge.remoteFiles = repoTree;
        }
      } catch (err) {
        console.error('Could not retreive your songs.');
      }
    } else {
      console.error('Could not retreive your songs.');
    }
  }

  renderLy = (src, filetype) => {
    console.log("HI!");
    console.log(`Rendering ${filetype}`)
    const id = String(Math.random());
    if (this.channel) {
      this.channel.objects.webContentsBridge.render(id, src, filetype)
      return new Promise((resolve, reject) => {
        this.resolvers[id] = resolve;
        this.rejectors[id] = reject;
      });
    } else {
      console.log(`No channel`);
      return new Promise((resolve, reject) => {
        reject(new Error("No channel"));
      })
    }
  }

  save = async (src, filename) => {
    const pdf = await this.renderLy(src, 'pdf');
    this.channel.objects.webContentsBridge.save(src, filename, pdf.content[0]);
  }

  /**
   * @param {string} id
   * @param {string[]} result
   * @param {string} log
   */
  handleRenderCompleted = (id, contents, logs) => {
    console.log(`Render completed ${id}`);
    if (this.resolvers[id]) {
      console.log("Found resolver");
      this.resolvers[id]({content: contents, logs});
      delete this.resolvers[id];
      delete this.rejectors[id];
    }
  }
  /**
   * @param {string} id
   * @param {string} error
   * @returns void
   */
  handleRenderError = (id, error) => {
    console.log(`Render error ${id}`);
    if (this.rejectors[id]) {
      console.warn(error);
      this.rejectors[id]({error});
      delete this.resolvers[id];
      delete this.rejectors[id];
    }
  }
}