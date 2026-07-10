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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { initAnalytics, trackPageview } from "../analytics";
import MusicXML2Ly from "../musicxml2ly/MusicXML2Ly";

export const Route = createFileRoute("/musicxml2ly")({
  component: MusicXml2LyRoute,
});

function MusicXml2LyRoute() {
  useEffect(() => {
    initAnalytics();
    trackPageview("/musicxml2ly", "Import MusicXML — Hacklily");
  }, []);

  return <MusicXML2Ly />;
}
