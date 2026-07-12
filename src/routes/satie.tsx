// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
} from "@tanstack/react-router";

import * as STYLES from "../satie/webapp/src/app.css";

export const Route = createFileRoute("/satie")({
  component: PlaygroundLayout,
});

function PlaygroundLayout() {
  const { pathname } = useLocation();
  const topLink =
    pathname !== "/satie" && pathname !== "/satie/" ? (
      <Link to="/satie" className={STYLES.toplink}>
        « Go home
      </Link>
    ) : null;

  return (
    <div>
      <header>
        <div className={STYLES.topbar} />
        {topLink}
      </header>
      <Outlet />
    </div>
  );
}
