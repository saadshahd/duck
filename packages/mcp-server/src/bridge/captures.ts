import type { CaptureResult } from "../protocol.js";

type Pending = {
  resolve(r: CaptureResult): void;
  reject(e: Error): void;
  timer: ReturnType<typeof setTimeout>;
};

const DEFAULT_TIMEOUT = 10_000;

export const createCaptures = (timeout = DEFAULT_TIMEOUT) => {
  const pending = new Map<string, Pending>();

  return {
    /** Register a capture request, returns the id. Caller must send the message. */
    request(): { id: string; promise: Promise<CaptureResult> } {
      const id = crypto.randomUUID();
      const promise = new Promise<CaptureResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Capture timed out after ${timeout}ms`));
        }, timeout);
        pending.set(id, { resolve, reject, timer });
      });
      return { id, promise };
    },

    /** Resolve a pending capture by id. No-op if id unknown. */
    resolve(id: string, image: string) {
      const p = pending.get(id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.delete(id);
      p.resolve({ image });
    },

    /** Reject all pending captures (used on shutdown). */
    rejectAll(reason: string) {
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error(reason));
      }
      pending.clear();
    },
  };
};
