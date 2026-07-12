// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import MusicXML2Ly from "#/components/MusicXML2Ly";
import { initAnalytics, trackPageview } from "#/lib/analytics";

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
