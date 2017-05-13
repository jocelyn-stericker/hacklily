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

import { StyleSheet } from 'aphrodite';

// tslint:disable:typedef

const previewPendingAnimation = {
  '0%': {
    opacity: 0.0,
  },
  '50%': {
    opacity: 0.15,
  },
  '100%': {
    opacity: 0.0,
  },
};

const CODE_EDITOR_BG = '#1e1e1e';
const HEADER_HEIGHT = 50;
const PREVIEW_WIDTH = '50%';
const EDITOR_WIDTH = '50%';

export const APP_STYLE = StyleSheet.create({
  App: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  content: {
    backgroundColor: CODE_EDITOR_BG,
    height: `calc(100% - ${HEADER_HEIGHT}px)`,
    position: 'absolute',
    width: '100%',
  },
  sheetMusicView: {
    backgroundColor: 'white',
    border: '0 none',
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
    right: '0',
    top: 0,
  },
  sheetMusicError: {
    textAlign: 'center',
    color: '#aeaeae',
    verticalAlign: 'middle',
    display: 'inline-block',
  },
  pendingPreviewMask: {
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationName: previewPendingAnimation,
    animationTimingFunction: 'ease-in-out',
    backgroundColor: 'black',
    bottom: 0,
    left: PREVIEW_WIDTH,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  errorMask: {
    color: 'white',
    textAlign: 'center',
    padding: 15,
    backgroundColor: 'black',
    bottom: 0,
    left: PREVIEW_WIDTH,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetMusicViewEdit: {
    left: EDITOR_WIDTH,
  },
  sheetMusicViewView: {
    left: 0,
  },
  monaco: {
    height: '100%',
  },
  monacoHidden: {
    display: 'none',
  },
  errorDecoration: {
    border: '2px solid red',
    color: 'red',
    textDecoration: 'underline',
    fontWeight: 'bold',
    fontStyle: 'oblique',
  },
});

export const MODAL_STYLE = StyleSheet.create({
  modal: {
    color: '#555555',
    margin: '0 0 0 -250px',
    padding: '15px 15px 0 15px',
    position: 'fixed',
    width: 500,
    top: 80,
    left: '50%',
    backgroundColor: 'white',
    border: '1px solid rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    zIndex: 1050,
  },
  big: {
    margin: '0 0 0 -400px',
    width: 800,
  },
  modalHeader: {
    borderBottom: '1px solid #ddd',
    padding: '0 0 9px 0',
  },
  modalBody: {
    margin: 0,
    maxHeight: 'none',
    padding: '20px 0 2px 0',
  },
  license: {
    fontSize: 12,
    marginTop: 20,
  },
  signInPrivacy: {
    marginTop: -10,
    textAlign: 'center',
  },
  gpl: {
    bottom: 10,
    position: 'absolute',
    right: 10,
  },
  login: {
    textAlign: 'center',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  closeButton: {
    float: 'right',
    textDecoration: 'none',
  },
  shareURL: {
    display: 'block',
    textAlign: 'center',
    padding: 5,
  },
});

export const MENU_STYLE = StyleSheet.create({
  menu: {
    color: '#555555',
    position: 'fixed',
    width: 400,
    top: 48,
    left: 65,
    backgroundColor: 'white',
    border: '1px solid rgba(0, 0, 0, 0.3)',
    zIndex: 1050,
    outline: 'none',
    padding: '14px 7px 4px 7px',
    '::after': {
      bottom: '100%',
      left: 40,
      border: 'solid transparent',
      content: '" "',
      height: 0,
      width: 0,
      position: 'absolute',
      pointerEvents: 'none',
      borderColor: 'transparent',
      borderBottomColor: 'white',
      borderWidth: 12,
      marginLeft: -30,
    },
    display: 'flex',
    flexDirection: 'row',
    height: 400,
  },
  menuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  menuColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: 7,
    paddingRight: 7,
  },
  section: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingBottom: 7,
  },
  songList: {
    flex: 1,
    position: 'relative',
  },
  placeholder: {
    textAlign: 'center',
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
  },
  option: {
    backgroundColor: '#f6f6f6',
    border: '1px solid #dedede',
    padding: 10,
    textDecoration: 'none',
    marginBottom: 10,
  },
  innerSongList: {
    marginLeft: 0,
    listStyle: 'none',
    paddingLeft: 0,
    marginTop: 0,
  },
});

export const HEADER_STYLE = StyleSheet.create({
  modeItem: {
    fontSize: 14,
    paddingBottom: 5,
    paddingTop: 5,
    width: 14,
  },
  header: {
    backgroundColor: '#efefef',
    borderBottom: '1px solid black',
    display: 'flex',
    fontFamily: 'Helvetica, Arial, sans-serif',
    height: HEADER_HEIGHT,
    width: '100%',
  },
  songs: {
    marginLeft: 16,
    marginRight: 16,
  },
  songsText: {
    color: '#6e6e6e',
    display: 'inline-block',
    fontSize: 14,
    padding: 9,
  },
  headerGroupWrapper: {
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  headerSpacer: {
    flex: 1,
  },
  logo: {
    height: 32,
    width: 32,
    marginLeft: 16,
    padding: '9px 0',
    transform: 'scale(-1, 1)',
  },
  help: {
    color: '#aeaeae',
    textDecoration: 'none',
    ':hover': {
      color: 'black',
    },
    display: 'inline-block',
    marginLeft: 8,
    fontSize: 16,
  },
  publish: {
    color: '#aeaeae',
    marginRight: 16,
    textDecoration: 'none',
    ':hover': {
      color: 'black',
    },
    fontSize: 14,
  },
  newSong: {
    color: '#aeaeae',
    marginRight: 32,
    textDecoration: 'none',
    ':hover': {
      color: 'black',
    },
    fontSize: 14,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    border: 0,
  },
});

export const GITHUB_STYLE = StyleSheet.create({
  btnGithub: {
    backgroundPosition: '1em',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '2em',
    borderRadius: '0.5em',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1em',
    height: '4em',
    lineHeight: '1em',
    padding: '0 2em 0 4em',
    textDecoration: 'none',
    transition: 'all 0.5s',
    backgroundColor: '#2a2a2a',
    backgroundImage: 'url(\'./github.svg\')',
    width: 262,
    ':hover': {
      backgroundColor: '#444444',
    },
    ':active': {
      backgroundColor: '#101010',
    },
  },
});

/**
 * @license
 * Copyright notice for the original version of 'button'
 * (https://github.com/Khan/react-components/blob/master/js/styles.jsx):
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Khan Academy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export const BUTTON_STYLE = StyleSheet.create({
  buttonStyle: {
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderLeft: '0',
    cursor: 'pointer',
    margin: '0',
    padding: '5px 10px',
    position: 'relative', // for hover

    ':first-child': {
      borderLeft: '1px solid #ccc',
      borderTopLeftRadius: '3px',
      borderBottomLeftRadius: '3px',
    },

    ':last-child': {
      borderRight: '1px solid #ccc',
      borderTopRightRadius: '3px',
      borderBottomRightRadius: '3px',
    },

    ':hover': {
      backgroundColor: '#ccc',
    },

    ':focus': {
      zIndex: '2',
    },
  },

  selectedStyle: {
    backgroundColor: '#ddd',
  },
});

export const LOGS_STYLE = StyleSheet.create({
  logsButton: {
    position: 'absolute',
    right: 20,
    bottom: 10,
    borderLeft: '1px solid #ccc',
  },
});

export const PUBLISH_STYLE = StyleSheet.create({
  // I'm having a hard time both expanding the input (flex works great here)
  // while vertically aligning things (inline-block works here), so I've resorted
  // to an unholy hack. A fix would be very appreciated.
  row: {
    display: 'table',
    fontSize: 14,
    width: '100%',
  },
  cell: {
    display: 'table-cell',
    width: '1px',
    whiteSpace: 'nowrap',
    fontSize: 14,
  },
  expand: {
    width: '100%',
  },
  mono: {
    fontFamily: 'monospace',
  },
  publishBtn: {
    textDecoration: 'none',
    color: 'black',
    float: 'right',
    fontSize: 14,
    fontFamily: 'sans-serif',
    ':disabled': {
      cursor: 'not-allowed',
      backgroundColor: '#ccc',
    },
  },
  footer: {
    marginTop: 15,
    marginBottom: 10,
    display: 'inline-block',
    width: '100%',
  },
  error: {
    fontSize: 14,
    position: 'absolute',
    bottom: 20,
    fontFamily: 'sans-serif',
    color: 'darkviolet',
  },
});
