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

// tslint:disable-next-line:match-default-export-name
import lodashDebounce from 'lodash.debounce';

export default function debounce(timeout: number):
    <T>(target: {}, propertyKey: string, descriptor: TypedPropertyDescriptor<() => T>) =>
    TypedPropertyDescriptor<() => T> {
  return <T>(
    target: {},
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<() => T>,
  ): TypedPropertyDescriptor<() => T> => {

    const originalMethod: (() => T) | undefined = descriptor.value;
    if (originalMethod === undefined) {
      throw new Error('No function to debounce.');
    }

    descriptor.value = lodashDebounce(originalMethod, timeout);

    return descriptor;
  };
}
