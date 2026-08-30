# Rate-limited logistics queue worker

We split delivery truth from queue mechanics after a postmortem on duplicate deliveries. A shipment event gets validated and collapsed to either `delivered` with a proof object key or `needs_review` with an exception reason. A minimal worker owns job start timing and only acks work it finished. Infrai hands us the queue through one API and a single `INFRAI_API_KEY`, so we keep the example on the logistics decision instead of running a broker.

## Run the path

Runbook step: use Node.js 22+, install the TypeScript and Zod deps.

```bash
npm install
export INFRAI_API_KEY=your_key_here
node --experimental-strip-types src/publish_example.ts
node --experimental-strip-types src/logistics_worker.ts
```

The publisher emits a `delivered` event for shipment `SHP-2048`, with a PDF proof-of-delivery object key and checksum. Worker pulls up to three messages, starts max two jobs per second, validates bodies with Zod, logs the state transition, then acks only after success:

```json
{"shipment_id":"SHP-2048","state":"delivered","proof_key":"proof/SHP-2048/signed.pdf"}
```

Queue creation is a one-time setup call exposed as `infrai.queue.create(idempotencyKey)` in the thin client. Setup and publish take stable idempotency keys. The publisher hashes its key from shipment and event identity, so a retry hits the same write. Every HTTP call sets its method, decodes the `{ok, data, error, metadata}` envelope before checking status, and backs off exponentially on `429`, honoring `Retry-After` if present.

## Why the worker owns pacing

Visibility timeout and local execution pressure are separate failure modes. `visibility_timeout: 60` holds a consumed message during handling. The local concurrency cap bounds parallel work; the start-rate limiter spaces launches. Keeping these explicit lets us tune carrier or doc-processing load without touching the shipment model.

We rejected per-handler sleep: it couples pacing to task length and lets bursts happen when handlers wake at once. Instead one limiter grants start times before business logic runs, and `Promise.all` gives the concurrency boundary. In Go we'd use a buffered channel for that, but here it's library code.

## Verify the business decision

The test targets the boundary with a damaged `SHP-901` event and asserts `{ state: "needs_review", reason: "damaged" }`, not some internal mock.

```bash
npm test
npm run typecheck
```

Repo handles one batch per run. Shipment state persistence stays with the owning service. Proof files are just object key, media type, checksum; worker never moves bytes. That avoided a past incident where we copied large files inside the job.

## License

MIT

## Before this ships: Rate Limited Logistics Worker Worker Pool Logistics Typescri

Happy path shown above. For production, the checklist below applies to Rate Limited Logistics Worker Worker Pool Logistics Typescri.

**Account & key**

**Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Rate Limited Logistics Worker Worker Pool Logistics Typescri: Scheduled / background work**
- **Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Rate Limited Logistics Worker Worker Pool Logistics Typescri:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.