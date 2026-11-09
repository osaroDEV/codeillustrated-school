import { timingSafeEqual } from "node:crypto";

// Minimal Flutterwave v3 client (server only). Docs:
//   Standard checkout   POST /v3/payments
//   Payment plans       POST /v3/payment-plans
//   Verify              GET  /v3/transactions/{id}/verify
//                       GET  /v3/transactions/verify_by_reference?tx_ref=
//   Subscriptions       GET  /v3/subscriptions?transaction_id=
//                       PUT  /v3/subscriptions/{id}/cancel
//   Webhooks            header `verif-hash` equals the dashboard secret hash
//
// Never trust a redirect or webhook body on its own: callers re-verify every
// transaction with verifyTransaction() and compare it with the order.

const BASE_URL = "https://api.flutterwave.com/v3";

export class FlutterwaveError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "FlutterwaveError";
  }
}

export interface FlwTransaction {
  id: number;
  tx_ref: string;
  status: string; // "successful" | "failed" | "pending" | …
  amount: number;
  charged_amount: number;
  currency: string;
  created_at: string;
  customer: { email: string; name?: string | null };
}

function secretKey(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new FlutterwaveError("FLW_SECRET_KEY is not set");
  return key;
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch (err) {
    throw new FlutterwaveError(`Could not reach Flutterwave: ${(err as Error).message}`);
  }
  const json = (await res.json().catch(() => null)) as { status?: string; message?: string; data?: T } | null;
  if (!res.ok || json?.status !== "success") {
    throw new FlutterwaveError(json?.message || `Flutterwave request failed (${res.status})`, res.status);
  }
  return json.data as T;
}

export async function createPaymentPlan(input: {
  name: string;
  amount: number;
  currency: "NGN" | "USD";
  interval: "monthly" | "yearly";
}): Promise<number> {
  const data = await call<{ id: number }>("/payment-plans", { method: "POST", body: input });
  return data.id;
}

/** A hosted checkout link. With paymentPlan set, the card is charged on that plan's schedule. */
export async function createCheckoutLink(input: {
  txRef: string;
  amount: number;
  currency: "NGN" | "USD";
  redirectUrl: string;
  customer: { email: string; name?: string | null };
  paymentPlan?: number;
  title: string;
  description?: string;
  meta?: Record<string, string>;
}): Promise<string> {
  const data = await call<{ link: string }>("/payments", {
    method: "POST",
    body: {
      tx_ref: input.txRef,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      payment_plan: input.paymentPlan,
      // Recurring plans only work with cards.
      payment_options: input.paymentPlan ? "card" : undefined,
      customer: { email: input.customer.email, name: input.customer.name ?? undefined },
      customizations: { title: input.title, description: input.description },
      meta: input.meta,
    },
  });
  return data.link;
}

export async function verifyTransaction(id: number | string): Promise<FlwTransaction> {
  return call<FlwTransaction>(`/transactions/${encodeURIComponent(String(id))}/verify`);
}

/** The transaction for one of our tx_refs, or null if the customer never paid. */
export async function verifyByReference(txRef: string): Promise<FlwTransaction | null> {
  try {
    return await call<FlwTransaction>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
  } catch (err) {
    if (err instanceof FlutterwaveError && (err.status === 400 || err.status === 404)) return null;
    throw err;
  }
}

/** Flutterwave's subscription id for the subscription a first charge started. */
export async function findSubscriptionId(transactionId: number): Promise<number | null> {
  const data = await call<{ id: number }[]>(`/subscriptions?transaction_id=${transactionId}`);
  return data?.[0]?.id ?? null;
}

export async function findActiveSubscriptionIds(email: string, planId: number): Promise<number[]> {
  const data = await call<{ id: number }[]>(
    `/subscriptions?email=${encodeURIComponent(email)}&plan=${planId}&status=active`
  );
  return (data ?? []).map((s) => s.id);
}

export async function cancelSubscription(id: number): Promise<void> {
  await call(`/subscriptions/${id}/cancel`, { method: "PUT" });
}

/** Whether a webhook's verif-hash header matches FLW_SECRET_HASH (constant time). */
export function webhookHashMatches(header: string | null, secret = process.env.FLW_SECRET_HASH): boolean {
  if (!header || !secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
