import { pathToFileURL } from "node:url";
import { infrai, type QueueMessage } from "./infrai_queue.ts";
import { decideShipment, shipmentEventSchema } from "./shipment_event.ts";

const CONCURRENCY = 3;
const JOBS_PER_SECOND = 2;

class StartRateLimiter {
  private nextStart = 0;
  private readonly intervalMs: number;

  constructor(startsPerSecond: number) {
    this.intervalMs = 1_000 / startsPerSecond;
  }

  async take(): Promise<void> {
    const now = Date.now();
    const scheduled = Math.max(now, this.nextStart);
    this.nextStart = scheduled + this.intervalMs;
    if (scheduled > now) {
      await new Promise<void>((resolve) => setTimeout(resolve, scheduled - now));
    }
  }
}

async function handleMessage(message: QueueMessage, limiter: StartRateLimiter): Promise<void> {
  await limiter.take();
  const event = shipmentEventSchema.parse(message.payload);
  const decision = decideShipment(event);
  console.log(JSON.stringify(decision));
  await infrai.queue.ack(message.message_id);
}

export async function runBatch(): Promise<number> {
  const batch = await infrai.queue.consume(CONCURRENCY, 60);
  const messages = batch.messages ?? [];
  const limiter = new StartRateLimiter(JOBS_PER_SECOND);

  await Promise.all(messages.slice(0, CONCURRENCY).map((message) => handleMessage(message, limiter)));
  return messages.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBatch()
    .then((count) => console.log(`Processed ${count} logistics job(s)`))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
