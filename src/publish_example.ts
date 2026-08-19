import { pathToFileURL } from "node:url";
import { infrai } from "./infrai_queue.ts";

export const deliveredExample = {
  shipment_id: "SHP-2048",
  event_type: "delivered",
  occurred_at: "2026-08-16T09:30:00.000Z",
  proof_of_delivery: {
    object_key: "proof/SHP-2048/signed.pdf",
    content_type: "application/pdf",
    sha256: "a".repeat(64),
  },
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  infrai.queue.publish(deliveredExample, `shipment-event:${deliveredExample.shipment_id}:delivered`)
    .then(() => console.log(`Published delivery event for ${deliveredExample.shipment_id}`))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
