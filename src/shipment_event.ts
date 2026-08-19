import { z } from "zod";

export const shipmentEventSchema = z.discriminatedUnion("event_type", [
  z.object({
    shipment_id: z.string().min(1),
    event_type: z.literal("delivered"),
    occurred_at: z.string().datetime(),
    proof_of_delivery: z.object({
      object_key: z.string().min(1),
      content_type: z.enum(["image/jpeg", "image/png", "application/pdf"]),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  }),
  z.object({
    shipment_id: z.string().min(1),
    event_type: z.literal("exception"),
    occurred_at: z.string().datetime(),
    exception: z.object({
      reason: z.enum(["address_unreachable", "damaged", "recipient_unavailable"]),
      detail: z.string().min(1).max(500),
    }),
  }),
]);

export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;

export type ShipmentDecision =
  | { shipment_id: string; state: "delivered"; proof_key: string }
  | { shipment_id: string; state: "needs_review"; reason: string };

export function decideShipment(event: ShipmentEvent): ShipmentDecision {
  if (event.event_type === "delivered") {
    return {
      shipment_id: event.shipment_id,
      state: "delivered",
      proof_key: event.proof_of_delivery.object_key,
    };
  }
  return {
    shipment_id: event.shipment_id,
    state: "needs_review",
    reason: event.exception.reason,
  };
}
