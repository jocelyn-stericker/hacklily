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

import { Auth, Repo } from "./auth";

export interface File {
  path: string;
  sha: string;
}

/**
 * Token that is thrown when we cannot cat a file becasue it does not exist.
 */
export class FileNotFound {
  message: string = "This file does not exist.";
}

export async function getRepo(
  accessToken: string,
  username: string,
  repoName: string,
): Promise<Repo> {
  const response: Response = await fetch(
    `https://api.github.com/repos/${username}/${repoName}?cache_bust=${new Date().getTime()}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `token ${accessToken}`,
      },
    },
  );

  if (response.status === 404) {
    throw new FileNotFound();
  } else if (response.status >= 400) {
    throw new Error("Could not get repo");
  }

  return response.json();
}

export async function createRepo(
  accessToken: string,
  username: string,
  repoName: string,
): Promise<Repo> {
  const response: Response = await fetch(
    `https://api.github.com/user/repos?cache_bust=${new Date().getTime()}`,
    {
      body: JSON.stringify({
        auto_init: true,
        description: `Sheet music by ${username}`,
        has_issues: false,
        has_pages: true,
        has_projects: false,
        has_wiki: false,
        homepage: `https://${username}.github.io/sheet-music`,
        name: repoName,
      }),
      headers: {
        Accept: "application/json",
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (response.status >= 400) {
    throw new Error("Could not create repo");
  }

  return response.json();
}

export async function getOrCreateRepo(auth: Auth): Promise<Repo> {
  const repoParts: string[] = auth.repo.split("/");
  if (repoParts.length !== 2) {
    throw new Error("Could not get repo details.");
  }

  let repo: Repo;
  try {
    repo = await getRepo(auth.accessToken, repoParts[0], repoParts[1]);
  } catch (err) {
    if (err instanceof FileNotFound) {
      if (repoParts[0] !== auth.username) {
        throw new Error("Invalid repo.");
      }
      repo = await createRepo(auth.accessToken, repoParts[0], repoParts[1]);
    } else {
      throw err;
    }
  }

  return repo;
}

export async function ls(
  accessToken: string,
  repo: string,
  ref: string = "master",
): Promise<File[]> {
  const headers: {} = {
    Authorization: `token ${accessToken}`,
  };

  // Note: sadly, cache: 'no-store' seems to be broken in Chrome with GH, so we use an
  // ugly cache_bust.
  const response: Response = await fetch(
    `https://api.github.com/repos/${repo}/contents?ref=${ref}&cache_bust=${new Date().getTime()}`,
    {
      headers,
    },
  );

  return (await response.json()).map((file: File) => ({
    path: file.path,
    sha: file.sha,
  }));
}

/**
 * Token that is thrown when we cannot save a file to GitHub because it already
 * exists, or was modified between when we got the SHA and when we made the save request.
 */
export class Conflict {
  message: string = "Cannot save file because it conflicts with another file.";
}

// https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
function b64DecodeUnicode(str: string) {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  return decodeURIComponent(
    atob(str)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
}

export async function cat(
  accessToken: string,
  repo: string,
  filename: string,
  ref: string = "master",
): Promise<{ content: string; sha: string }> {
  const headers: {} = {
    Authorization: `token ${accessToken}`,
  };

  // Note: we should get more strict with our ref and get rid of the cache_bust
  const response: Response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filename}?ref=${ref}` +
      `&cache_bust=${new Date().getTime()}`,
    {
      headers,
    },
  );

  if (response.status === 404) {
    throw new FileNotFound();
  }

  const obj: { content: string; sha: string } = await response.json();

  return {
    content: b64DecodeUnicode(obj.content),
    sha: obj.sha,
  };
}

export async function write(
  accessToken: string,
  repo: string,
  filename: string,
  base64: string,
  sha?: string,
  ref: string = "master",
): Promise<void> {
  const response: Response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filename}`,
    {
      body: JSON.stringify({
        branch: ref,
        content: base64,
        message: `Saved via ${process.env.HOMEPAGE || "Hacklily"}`,
        sha: sha ? sha : undefined,
      }),
      headers: {
        Accept: "application/json",
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );

  if (response.status === 409) {
    throw new Conflict();
  }

  if (response.status === 404) {
    throw new FileNotFound();
  }

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Status: ${response.statusText}`);
  }
}

export async function rm(
  accessToken: string,
  repo: string,
  filename: string,
  sha: string,
  ref: string = "master",
): Promise<void> {
  const response: Response = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filename}`,
    {
      body: JSON.stringify({
        branch: ref,
        message: `Saved via ${process.env.HOMEPAGE || "Hacklily"}`,
        sha: sha ? sha : undefined,
      }),
      headers: {
        Accept: "application/json",
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "DELETE",
    },
  );

  if (response.status === 409) {
    throw new Conflict();
  }

  if (response.status !== 200) {
    throw new Error(`Status: ${response.statusText}`);
  }
}
