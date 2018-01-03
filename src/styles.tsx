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
  // tslint:disable-next-line:object-literal-sort-keys
  '100%': {
    opacity: 0.0,
  },
};

const PREVIEW_WIDTH = '50%';
const EDITOR_WIDTH = '50%';

export const APP_STYLE = StyleSheet.create({
  errorDecoration: {
    border: '2px solid red',
    color: 'red',
    fontStyle: 'oblique',
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  errorMask: {
    backgroundColor: 'black',
    bottom: 0,
    color: 'white',
    left: PREVIEW_WIDTH,
    padding: 15,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    top: 0,
  },
  githubButton: {
    borderLeft: '1px solid #ccc',
    bottom: 10,
    color: 'black',
    maxHeight: '90%',
    overflow: 'auto',
    position: 'absolute',
    right: 110,
    textDecoration: 'none',
  },
  monacoHidden: {
    display: 'none',
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
  previewPendingMaskModeView: {
    left: 0,
  },
  readOnlyNotification: {
    backgroundColor: '#1e1e1e',
    color: 'white',
    fontWeight: 'bold',
    height: 20,
    left: 0,
    padding: 10,
    top: 0,
    zIndex: 100000,
  },
  sheetMusicError: {
    color: '#aeaeae',
    display: 'inline-block',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  sheetMusicView: {
    alignItems: 'center',
    backgroundColor: 'white',
    border: '0 none',
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
    right: '0',
    top: 0,
  },
  sheetMusicViewEdit: {
    left: EDITOR_WIDTH,
  },
  sheetMusicViewView: {
    left: 0,
  },
});

export const MODAL_STYLE = StyleSheet.create({
  big: {
    margin: '0 0 0 -400px',
    width: 800,
  },
  closeButton: {
    float: 'right',
    textDecoration: 'none',
  },
  gpl: {
    '@media (max-width: 530px)': {
      display: 'none',
    },
    bottom: 10,
    position: 'absolute',
    right: 10,
  },
  license: {
    fontSize: 12,
    marginTop: 20,
  },
  link: {
    ':hover': {
      color: 'black',
    },
    color: 'blue',
    cursor: 'pointer',
    fontSize: 16,
    textDecoration: 'underline',
  },
  login: {
    textAlign: 'center',
  },
  modal: {
    '@media (max-width: 530px)': {
      left: 0,
      margin: 0,
      position: 'absolute',
      width: '100%',
    },
    backgroundColor: 'white',
    border: '1px solid rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    boxSizing: 'border-box',
    color: '#555555',
    left: '50%',
    margin: '0 0 0 -265px',
    padding: '15px 15px 0 15px',
    position: 'absolute',
    top: 80,
    width: 530,
    zIndex: 1050,
  },
  modalBody: {
    margin: 0,
    maxHeight: 'none',
    padding: '20px 0 2px 0',
  },
  modalHeader: {
    borderBottom: '1px solid #ddd',
    padding: '0 0 9px 0',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  shareURL: {
    display: 'block',
    padding: 5,
    textAlign: 'center',
  },
  signInPrivacy: {
    marginTop: -10,
    textAlign: 'center',
  },
});

export const MENU_STYLE = StyleSheet.create({
  deleteSong: {
    ':hover': {
      color: 'red',
    },
    color: '#aeaeae',
    float: 'right',
  },
  innerSongList: {
    listStyle: 'none',
    marginLeft: 0,
    marginTop: 0,
    paddingLeft: 0,
  },
  menu: {
    '::after': {
      '@media (max-width: 500px)': {
        left: 97,
      },
      borderBottomColor: 'white',
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderStyle: 'solid',
      borderTopColor: 'transparent',
      borderWidth: 12,
      bottom: '100%',
      content: '" "',
      height: 0,
      left: 40,
      marginLeft: -30,
      pointerEvents: 'none',
      position: 'absolute',
      width: 0,
    },
    '@media (max-width: 500px)': {
      left: 0,
      position: 'absolute',
      width: '100%',
    },
    backgroundColor: 'white',
    border: '1px solid rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'row',
    height: 500,
    left: 65,
    outline: 'none',
    padding: '14px 7px 4px 7px',
    position: 'absolute',
    top: 48,
    width: 400,
    zIndex: 1050,

  },
  menuColumn: {
    '@media (max-width: 500px)': {
      marginRight: 14,
    },
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflow: 'auto',
    paddingLeft: 7,
    paddingRight: 7,
  },
  menuOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  option: {
    ':hover': {
      color: 'blue',
    },
    backgroundColor: '#f6f6f6',
    border: '1px solid #dedede',
    color: 'black',
    fontSize: 16,
    marginBottom: 10,
    padding: 10,
    textAlign: 'left',
    textDecoration: 'none',
  },
  placeholder: {
    color: 'black',
    fontSize: 16,
    left: '50%',
    position: 'absolute',
    textAlign: 'center',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
  },
  placeholderLink: {
    ':hover': {
      color: 'black',
    },
    color: 'blue',
    fontSize: 16,
    textDecoration: 'underline',
  },
  section: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingBottom: 7,
  },
  song: {
    ':hover': {
      color: 'blue',
    },
    color: 'black',
    fontSize: 16,
    marginBottom: 4,
    textDecoration: 'none',
  },
  songList: {
    flex: 1,
    position: 'relative',
  },
});

export const HEADER_STYLE = StyleSheet.create({
  headerGroupWrapper: {
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  headerSpacer: {
    flex: 1,
  },
  logo: {
    height: 32,
    marginLeft: 16,
    padding: '9px 0',
    transform: 'scale(-1, 1)',
    width: 32,
  },
  miniGroup: {
    marginLeft: 16,
  },
  modeItem: {
    fontSize: 14,
    paddingBottom: 5,
    paddingTop: 5,
    width: 14,
  },
  newSong: {
    ':hover': {
      color: 'black',
    },
    color: '#aeaeae',
    fontSize: 14,
    marginRight: 32,
    textDecoration: 'none',
  },
  playButton: {
    ':hover': {
      backgroundColor: '#ccc',
    },
    color: '#6e6e6e',
    display: 'inline-block',
    fontSize: 14,
    height: 36,
    padding: 9,
  },
  playTime: {
    textAlign: 'left',
    width: 80,
  },
  publish: {
    color: '#aeaeae',
    cursor: 'unset',
    fontSize: 14,
    marginRight: 16,
    textDecoration: 'none',
  },
  publishActive: {
    ':hover': {
      color: 'black',
    },
    cursor: 'pointer',
  },
  songs: {
    marginLeft: 16,
  },
  songsText: {
    ':hover': {
      backgroundColor: '#ccc',
    },
    color: '#6e6e6e',
    display: 'inline-block',
    fontSize: 14,
    padding: 9,
  },
  srOnly: {
    border: 0,
    clip: 'rect(0,0,0,0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    width: 1,
  },
});

export const GITHUB_STYLE = StyleSheet.create({
  btnGithub: {
    ':active': {
      backgroundColor: '#101010',
    },
    ':hover': {
      backgroundColor: '#444444',
    },
    backgroundColor: '#2a2a2a',
    backgroundImage: 'url(\'./github.svg\')',
    backgroundPosition: '1em',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '2em',
    border: 'none',
    borderRadius: '0.5em',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1em',
    height: '4em',
    lineHeight: '1em',
    padding: '0 2em 0 4em',
    textDecoration: 'none',
    transition: 'all 0.5s',
    width: 262,
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
    ':first-child': {
      borderBottomLeftRadius: '3px',
      borderLeft: '1px solid #ccc',
      borderTopLeftRadius: '3px',
    },
    ':focus': {
      zIndex: '2',
    },
    ':hover': {
      backgroundColor: '#ccc',
    },
    ':last-child': {
      borderBottomRightRadius: '3px',
      borderRight: '1px solid #ccc',
      borderTopRightRadius: '3px',
    },
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderLeft: '0',
    cursor: 'pointer',
    margin: '0',
    padding: '5px 10px',
    position: 'relative', // for hover
  },

  selectedStyle: {
    backgroundColor: '#ddd',
  },
});

export const LOGS_STYLE = StyleSheet.create({
  logsButton: {
    borderLeft: '1px solid #ccc',
    bottom: 10,
    maxHeight: '90%',
    overflow: 'auto',
    position: 'absolute',
    right: 20,
  },
  mask: {
    bottom: 0,
    left: 0,
    position: 'fixed',
    right: 0,
    top: 0,
  },
});

export const PUBLISH_STYLE = StyleSheet.create({
  // I'm having a hard time both expanding the input (flex works great here)
  // while vertically aligning things (inline-block works here), so I've resorted
  // to an unholy hack. A fix would be very appreciated.
  cell: {
    display: 'table-cell',
    fontSize: 14,
    whiteSpace: 'nowrap',
    width: '1px',
  },
  error: {
    bottom: 20,
    color: 'red',
    fontFamily: 'sans-serif',
    fontSize: 14,
    position: 'absolute',
  },
  expand: {
    width: '100%',
  },
  footer: {
    display: 'inline-block',
    marginBottom: 10,
    marginTop: 15,
    width: '100%',
  },
  mono: {
    fontFamily: 'monospace',
  },
  publishBtn: {
    ':disabled': {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
    color: 'black',
    float: 'right',
    fontFamily: 'sans-serif',
    fontSize: 14,
    textDecoration: 'none',
  },
  row: {
    display: 'table',
    fontSize: 14,
    width: '100%',
  },
});
