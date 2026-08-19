import assert from "node:assert/strict";
import test from "node:test";
import { decideShipment, shipmentEventSchema } from "../src/shipment_event.ts";

test("a damaged shipment is routed to review", () => {
  const event = shipmentEventSchema.parse({
    shipment_id: "SHP-901",
    event_type: "exception",
    occurred_at: "2026-08-16T10:00:00.000Z",
    exception: { reason: "damaged", detail: "Outer carton crushed" },
  });

  assert.deepEqual(decideShipment(event), {
    shipment_id: "SHP-901",
    state: "needs_review",
    reason: "damaged",
  });
});
