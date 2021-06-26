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

import { StyleSheet } from "aphrodite";

const previewPendingAnimation = {
  "0%": {
    opacity: 0.0,
  },
  "50%": {
    opacity: 0.15,
  },
  "100%": {
    opacity: 0.0,
  },
};

const PREVIEW_WIDTH = "50%";
const EDITOR_WIDTH = "50%";

export const APP_STYLE = StyleSheet.create({
  errorDecoration: {
    border: "2px solid red",
    color: "red",
    fontStyle: "oblique",
    fontWeight: "bold",
    textDecoration: "underline",
  },
  errorMask: {
    backgroundColor: "black",
    bottom: 0,
    color: "white",
    left: PREVIEW_WIDTH,
    padding: 15,
    position: "absolute",
    right: 0,
    textAlign: "center",
    top: 0,
  },
  monacoHidden: {
    display: "none",
  },
  pendingPreviewMask: {
    animationDuration: "2s",
    animationIterationCount: "infinite",
    animationName: previewPendingAnimation,
    animationTimingFunction: "ease-in-out",
    backgroundColor: "black",
    bottom: 0,
    left: PREVIEW_WIDTH,
    position: "absolute",
    right: 0,
    top: 0,
  },
  previewPendingMaskModeView: {
    left: 0,
  },
  sheetMusicError: {
    color: "#aeaeae",
    display: "inline-block",
    textAlign: "center",
    verticalAlign: "middle",
  },
  sheetMusicView: {
    alignItems: "center",
    backgroundColor: "white",
    border: "0 none",
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    right: "0",
    top: 0,
  },
  sheetMusicViewEdit: {
    left: EDITOR_WIDTH,
  },
  sheetMusicViewView: {
    left: 0,
  },
  urgentEditorNotification: {
    backgroundColor: "#1e1e1e",
    color: "white",
    fontWeight: "bold",
    left: 0,
    padding: 10,
    top: 0,
    zIndex: 100000,
  },
  urgentEditorNotificationClose: {
    color: "#aeaeae",
  },
});

export const GITHUB_STYLE = StyleSheet.create({
  btnGithub: {
    ":active": {
      backgroundColor: "#101010",
    },
    ":hover": {
      backgroundColor: "#444444",
    },
    backgroundColor: "#2a2a2a",
    backgroundImage: "url('./github.svg')",
    backgroundPosition: "1em",
    backgroundRepeat: "no-repeat",
    backgroundSize: "2em",
    border: "none",
    borderRadius: "0.5em",
    color: "white",
    cursor: "pointer",
    fontSize: "1em",
    height: "4em",
    lineHeight: "1em",
    padding: "0 2em 0 4em",
    textDecoration: "none",
    transition: "all 0.5s",
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
    ":first-child": {
      borderBottomLeftRadius: "3px",
      borderLeft: "1px solid #ccc",
      borderTopLeftRadius: "3px",
    },
    // TODO: why is :focus not valid?
    [":focus" as any]: {
      zIndex: "2",
    },
    ":hover": {
      backgroundColor: "#ccc",
    },
    ":last-child": {
      borderBottomRightRadius: "3px",
      borderRight: "1px solid #ccc",
      borderTopRightRadius: "3px",
    },
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderLeft: "0",
    cursor: "pointer",
    margin: "0",
    padding: "5px 10px",
    position: "relative", // for hover
  },

  downloadChoiceButton: {
    boxSizing: "border-box",
    color: "black",
    display: "inline-block",
    marginBottom: 10,
    textDecoration: "none",
    width: "100%",
  },

  selectedStyle: {
    backgroundColor: "#ddd",
  },
});
