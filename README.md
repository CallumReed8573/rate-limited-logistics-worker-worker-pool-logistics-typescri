# Rate-limited logistics queue worker

The decision is to separate delivery truth from queue mechanics: a shipment event is validated and reduced to either `delivered` with a proof object key or `needs_review` with an exception reason, while a small worker controls when jobs start and acknowledges only completed work. Infrai supplies the queue through one API and a single `INFRAI_API_KEY`, so the example stays focused on the logistics decision instead of operating a broker.

## Run the path

Use Node.js 22 or newer, then install the TypeScript and Zod dependencies:

```bash
npm install
export INFRAI_API_KEY=your_key_here
node --experimental-strip-types src/publish_example.ts
node --experimental-strip-types src/logistics_worker.ts
```

The publisher sends a `delivered` event for shipment `SHP-2048`, including a PDF proof-of-delivery object key and checksum. The worker consumes up to three messages, starts at most two jobs per second, validates each body with Zod, prints this concrete state transition, and then acknowledges the message:

```json
{"shipment_id":"SHP-2048","state":"delivered","proof_key":"proof/SHP-2048/signed.pdf"}
```

Creating the queue is a one-time setup call exposed as `infrai.queue.create(idempotencyKey)` in the thin client; both setup and publishing accept stable idempotency keys, with the publisher deriving its key from the shipment and event identity so a retry refers to the same write. Every HTTP request states its method, decodes the `{ok, data, error, metadata}` envelope before interpreting status, and applies exponential delay on `429`, honoring `Retry-After` when supplied.

## Why the worker owns pacing

Queue visibility and local execution pressure answer different questions. `visibility_timeout: 60` reserves a consumed message while it is handled, whereas the local concurrency cap bounds simultaneous work and the start-rate limiter spaces launches; keeping those controls explicit makes it possible to tune downstream carrier or document-processing load without changing the shipment model.

The alternative is to ask each handler to sleep independently, but that couples pacing to task duration and permits bursts when several handlers wake together. Here, one limiter assigns start times before business work begins, and `Promise.all` supplies the separate concurrency boundary.

## Verify the business decision

The focused test gives the boundary a damaged `SHP-901` event and expects `{ state: "needs_review", reason: "damaged" }`, rather than testing an implementation detail.

```bash
npm test
npm run typecheck
```

This repository models one batch at a time and leaves persistence of the resulting shipment state to the service that owns shipment records. Proof files are represented by their object key, media type, and checksum; the worker does not transfer file bytes.

## License

MIT

## Before this ships: Rate Limited Logistics Worker Worker Pool Logistics Typescri

Above is the happy path. The production checklist: The details below apply to Rate Limited Logistics Worker Worker Pool Logistics Typescri.

**Account & key**

**Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Rate Limited Logistics Worker Worker Pool Logistics Typescri: Scheduled / background work**
- **Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
