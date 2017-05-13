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

export interface File {
  path: string;
  sha: string;
}

export async function ls(
    accessToken: string,
    repo: string,
    ref: string = 'master',
  ): Promise<File[]> {

  const headers: {} = {
    Authorization: `token ${accessToken}`,
  };

  const response: Response = await fetch(
    `https://api.github.com/repos/${repo}/contents?ref=${ref}`,
    { headers });

  return (await response.json()).map((file: File) => ({
    path: file.path,
    sha: file.sha,
  }));
}

// tslint:disable-next-line:no-stateless-class -- Conflict is a token
export class Conflict {
}

export async function cat(
    accessToken: string,
    repo: string,
    filename: string,
    ref: string = 'master',
): Promise<string> {

  const headers: {} = {
    Authorization: `token ${accessToken}`,
  };

  const response: Response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filename}?ref=${ref}`,
    { headers });
  return atob((await response.json()).content);
}

export async function write(
    accessToken: string,
    repo: string,
    filename: string,
    base64: string,
    sha?: string,
    ref: string = 'master',
): Promise<void> {
  const response: Response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filename}`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'PUT',
      body: JSON.stringify({
        branch: ref,
        message: 'Saved via hacklily.github.io',
        content: base64,
        sha: sha ? sha : undefined,
      }),
    },
  );

  if (response.status === 409) {
    throw new Conflict();
  }

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Status: ${response.statusText}`);
  }
}
