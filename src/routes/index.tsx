// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { createFileRoute } from "@tanstack/react-router";

import App from "#/components/App";
import {
  hacklilyBeforeLoad as beforeLoad,
  useHacklilyAppProps,
  validateHacklilySearch as validateSearch,
} from "#/components/hacklilyRoute";

export const Route = createFileRoute("/")({
  component: HacklilyApp,
  pendingComponent: () => {
    return (
      <div className="App" style={{ zIndex: -2 }}>
        <div className="header" />
        <div className="content" style={{ width: "50%" }}>
          <div className="monaco" />
        </div>
      </div>
    );
  },
  validateSearch,
  beforeLoad,
});

function HacklilyApp() {
  const search = Route.useSearch();
  return <App {...search} {...useHacklilyAppProps(search)} variant="server" />;
}
