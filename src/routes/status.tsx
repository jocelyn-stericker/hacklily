// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import Status from "#/components/Status";
import { initAnalytics, trackPageview } from "#/lib/analytics";

export const Route = createFileRoute("/status")({
  component: StatusRoute,
});

function StatusRoute() {
  useEffect(() => {
    initAnalytics();
    trackPageview("/status", "Status — Hacklily");
  }, []);

  return <Status />;
}
