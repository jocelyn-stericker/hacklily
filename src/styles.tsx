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

export const APP_STYLE = {
  errorDecoration:
    "border-2 border-red-600 text-red-600 italic font-bold underline",
  errorMask:
    "bg-black text-white absolute inset-y-0 left-[50%] p-4 text-center",
  monacoHidden: "hidden",
  pendingPreviewMask:
    "bg-black absolute inset-y-0 left-[50%] animate-[previewPending_2s_ease-in-out_infinite]",
  previewPendingMaskModeView: "left-0",
  sheetMusicError: "text-[#aeaeae] inline-block text-center align-middle",
  sheetMusicView:
    "items-center bg-white border-0 absolute inset-y-0 right-0 flex justify-center overflow-hidden",
  sheetMusicViewEdit: "left-[50%]",
  sheetMusicViewView: "left-0",
  urgentEditorNotification:
    "bg-[#1e1e1e] text-white font-bold left-0 p-2.5 top-0 z-[100000]",
  urgentEditorNotificationClose: "text-[#aeaeae]",
} as const;

export const GITHUB_STYLE = {
  btnGithub:
    "bg-[#2a2a2a] bg-[url('./github.svg')] bg-[length:2em] bg-[position:1em] bg-no-repeat border-none rounded-[0.5em] text-white cursor-pointer text-[1em] h-[4em] leading-[1em] px-[2em] pl-[4em] no-underline transition-all duration-500 w-[262px] hover:bg-[#444444] active:bg-[#101010]",
} as const;

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
export const BUTTON_STYLE = {
  buttonStyle:
    "bg-white border border-[#ccc] border-l-0 cursor-pointer m-0 px-2.5 py-[5px] relative first:border-l first:border-[#ccc] first:rounded-bl first:rounded-tl last:border-r last:border-[#ccc] last:rounded-br last:rounded-tr hover:bg-[#ccc] focus:z-[2]",
  downloadChoiceButton:
    "box-border text-black inline-block mb-2.5 no-underline w-full",
  selectedStyle: "bg-[#ddd]",
} as const;
