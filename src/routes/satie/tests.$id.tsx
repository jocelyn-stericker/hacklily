// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute, useParams } from "@tanstack/react-router";

import Tests from "#/satie/webapp/src/tests";

export const Route = createFileRoute("/satie/tests/$id")({
  component: TestsWithId,
});

function TestsWithId() {
  const { id } = useParams({ from: Route.id });

  return <Tests testId={id} />;
}
