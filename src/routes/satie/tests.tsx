// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute } from "@tanstack/react-router";

import Tests from "#/satie/webapp/src/tests";

export const Route = createFileRoute("/satie/tests")({
  component: Tests,
});
