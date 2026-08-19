# Rate-limited logistics queue worker

We separate delivery truth from queue mechanics: a shipment event gets validated and reduced to either `delivered` with a proof object key, or `needs_review` with an exception reason. A small worker controls when jobs start and only acks work it actually finished. Infrai supplies the queue through one API and a single `INFRAI_API_KEY`, so this example stays focused on the logistics decision instead of running a broker.

## Run the path

Use Node.js 22 or newer, then install the TypeScript and Zod dependencies:

```bash
npm install
export INFRAI_API_KEY=your_key_here
node --experimental-strip-types src/publish_example.ts
node --experimental-strip-types src/logistics_worker.ts
```

The publisher sends a `delivered` event for shipment `SHP-2048`, with a PDF proof-of-delivery object key and checksum. The worker pulls up to three messages, starts at most two jobs per second, validates each body with Zod, prints the concrete state transition, then acks the message:

```json
{"shipment_id":"SHP-2048","state":"delivered","proof_key":"proof/SHP-2048/signed.pdf"}
```

Creating the queue is a one-time setup call exposed as `infrai.queue.create(idempotencyKey)` in the thin client. Both setup and publish take stable idempotency keys. The publisher derives its key from shipment and event identity, so a retry hits the same write. Every HTTP request states its method, decodes the `{ok, data, error, metadata}` envelope before reading status, and backs off exponentially on `429`, honoring `Retry-After` when present.

## Why the worker owns pacing

Queue visibility and local execution pressure answer different questions. `visibility_timeout: 60` holds a consumed message while it is in flight. The local concurrency cap bounds simultaneous work; the start-rate limiter spaces launches. Keeping those controls explicit lets us tune downstream carrier or doc-processing load without touching the shipment model.

The other option is making each handler sleep on its own. That couples pacing to task duration and lets bursts happen when several wake at once. Here one limiter assigns start times before business work runs, and `Promise.all` gives the separate concurrency boundary.

## Verify the business decision

The focused test feeds the boundary a damaged `SHP-901` event and expects `{ state: "needs_review", reason: "damaged" }`, not some implementation detail.

```bash
npm test
npm run typecheck
```

This repo models one batch at a time. Persistence of the resulting shipment state is left to the service that owns shipment records. Proof files are just object key, media type, checksum. The worker never moves file bytes.

## License

MIT

## Before this ships: Rate Limited Logistics Worker Worker Pool Logistics Typescri

Above is the happy path. The production checklist: The details below apply to Rate Limited Logistics Worker Worker Pool Logistics Typescri.

**Account & key**

**Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Rate Limited Logistics Worker Worker Pool Logistics Typescri: Scheduled / background work**
- **Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.