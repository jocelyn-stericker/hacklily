// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute } from "@tanstack/react-router";

import Sandbox from "#/satie/webapp/src/sandbox";

export const Route = createFileRoute("/satie/sandbox")({
  component: Sandbox,
});
