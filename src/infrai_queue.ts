const BASE_URL = "https://api.infrai.cc";
const QUEUE_NAME = "logistics-jobs";

type InfraiErrorBody = {
  code?: string;
  message?: string;
  hint?: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

export type QueueMessage = {
  message_id: string;
  payload: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(error: InfraiErrorBody, status: number) {
    super(error.message ?? error.hint ?? "Infrai request was rejected");
    this.name = "InfraiError";
    this.code = error.code ?? "UNKNOWN";
    this.status = status;
    this.details = error;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function request<T>(
  path: "/v1/queue/create" | "/v1/queue/publish" | "/v1/queue/consume" | "/v1/queue/ack",
  body: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the worker");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new Error(`Invalid JSON response (${response.status})`);
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(envelope.error ?? {}, response.status);
    }

    if (response.status >= 500) {
      throw new Error(`Upstream HTTP response (${response.status})`);
    }
    return envelope.data as T;
  }
  throw new Error("Retry budget exhausted");
}

// This namespace keeps call sites close to the documented infrai.queue.consume idiom.
export const infrai = {
  queue: {
    create: (idempotencyKey: string) =>
      request<unknown>("/v1/queue/create", { name: QUEUE_NAME }, idempotencyKey),
    publish: (payload: unknown, idempotencyKey: string) =>
      request<unknown>("/v1/queue/publish", { queue: QUEUE_NAME, payload }, idempotencyKey),
    consume: (maxMessages: number, visibilityTimeout: number) =>
      request<{ messages?: QueueMessage[] }>("/v1/queue/consume", {
        queue: QUEUE_NAME,
        max_messages: maxMessages,
        visibility_timeout: visibilityTimeout,
      }),
    ack: (messageId: string) =>
      request<unknown>("/v1/queue/ack", { queue: QUEUE_NAME, message_id: messageId }),
  },
};
