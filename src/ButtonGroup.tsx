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
 *
 * Copyright notice for the original version of this file
 * (https://github.com/Khan/react-components/blob/master/js/button-group.jsx):
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

import { css } from 'aphrodite';
import React from 'react';
import { BUTTON_STYLE } from './styles';

export interface ButtonSpec {
  content?: React.ReactNode;
  title?: string;
  value: string | number | null;
}

interface Props {
  allowEmpty?: boolean;
  buttons: ButtonSpec[];
  value: string | number | null;
  onChange(value: string | number | null): void;
}

/**
 * ButtonGroup is an aesthetically pleasing group of buttons.
 *
 * The class requires these properties:
 *   buttons - an array of objects with keys:
 *     "value": this is the value returned when the button is selected
 *     "content": this is the JSX shown within the button, typically a string
 *         that gets rendered as the button's display text
 *     "title": this is the title-text shown on hover
 *   onChange - a function that is provided with the updated value
 *     (which it then is responsible for updating)
 *
 * The class has these optional properties:
 *   value - the initial value of the button selected, defaults to null.
 *   allowEmpty - if false, exactly one button _must_ be selected; otherwise
 *     it defaults to true and _at most_ one button (0 or 1) may be selected.
 *
 * Requires stylesheets/perseus-admin-package/editor.less to look nice.
 */
export default class ButtonGroup extends React.PureComponent<Props> {
  static defaultProps: Partial<Props> = {
    allowEmpty: true,
    value: null,
  };

  render(): JSX.Element {
    const value: string | number | null = this.props.value;
    const buttons: JSX.Element[] = this.props.buttons.map((button: ButtonSpec, i: number) => {
      const buttonGroupClassName: string = css(
        BUTTON_STYLE.buttonStyle,
        button.value === value && BUTTON_STYLE.selectedStyle,
      );

      return (
        <button
          className={buttonGroupClassName}
          onClick={this.handleClick}
          id={String(i)}
          key={String(i)}
          data-value={JSON.stringify(button.value)}
          title={button.title}
          type="button"
        >
          {button.content || String(button.value)}
        </button>
      );
    });

    const outerStyle: object = {
      display: 'inline-block',
    };

    return (
      <div style={outerStyle}>
        {buttons}
      </div>
    );
  }

  private handleClick = (ev: React.MouseEvent<HTMLButtonElement>): void => {
    this.toggleSelect(JSON.parse(ev.currentTarget.dataset.value || 'null'));
  }

  private toggleSelect(newValue: string | number | null): void {
    const value: string | number | null = this.props.value;

    if (this.props.allowEmpty) {
            // Select the new button or unselect if it's already selected
      this.props.onChange(value !== newValue ? newValue : null);
    } else {
      this.props.onChange(newValue);
    }
  }
}
