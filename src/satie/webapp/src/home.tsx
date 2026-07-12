import { Link } from "@tanstack/react-router";
import * as React from "react";

import Test from "./test";

export default function Home() {
  return (
    <div>
      <h1>Satie is a sheet music toolkit.</h1>
      <aside>
        Satie is designed to help JavaScript developers create interactive sheet
        music applications.{" "}
        <a href="https://github.com/emilyskidsister/satie/">
          Learn more at GitHub »
        </a>
      </aside>
      <p>
        Satie is created by <a href="https://nettek.ca">Jocelyn Stericker</a>{" "}
        and is a component of <a href="https://hacklily.org">Hacklily</a>, a
        sheet music editor.
      </p>
      <Test
        singleLine={false}
        chrome={false}
        name="01a"
        filename={"/lilypond-regression/01a.xml"}
      />
      <Link to="/satie/tests">
        <button>Run test suite »</button>
      </Link>
    </div>
  );
}
