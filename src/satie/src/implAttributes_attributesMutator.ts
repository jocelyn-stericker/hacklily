// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { IAny } from "#/musicxml-interfaces/operations";

import type { IAttributesModel } from "./implAttributes_attributesModel";
import { mutate, parentExists } from "./private_mutate";

export default function attributesMutator(
  _preview: boolean,
  attributes: IAttributesModel,
  op: IAny,
) {
  // Check if we are being asked to clone & create.
  if (!parentExists(attributes, op.p)) {
    console.warn(
      "Invalid patch -- it's likely to a " +
        "model that only exists in a snapshot. You'll need to explicitly create it.",
    );
    return;
  }

  // Bye.
  mutate(attributes, op);
}
