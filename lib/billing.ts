import { customAlphabet, nanoid } from "nanoid";

// Pure billing rules shared by checkout, the Flutterwave webhook, the daily
// cron and the dashboard. Database and HTTP work lives in lib/billing-server.ts.

export type Currency = "NGN" | "USD";

/**
 * After current_period_end a subscriber keeps their seat this long while
 * Flutterwave retries the card. Keep in sync with subscription_grace() in
 * supabase/migrations/20261105000000_billing.sql.
 */
export const SUBSCRIPTION_GRACE_DAYS = 3;
const GRACE_MS = SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000;

/** Offerings that can be bought online. */
export const PURCHASABLE_KINDS = ["cohort_group", "self_paced"] as const;
export type PurchasableKind = (typeof PURCHASABLE_KINDS)[number];

export type BillingInterval = "monthly" | "yearly";

export interface PricedOffering {
  price_usd: number | string;
  price_ngn: number | string;
  yearly_price_usd?: number | string | null;
  yearly_price_ngn?: number | string | null;
}

/** What one billing period costs, or null if that combination isn't on sale. */
export function checkoutAmount(
  offering: PricedOffering,
  currency: Currency,
  interval: BillingInterval
): number | null {
  const raw =
    interval === "yearly"
      ? currency === "NGN"
        ? offering.yearly_price_ngn
        : offering.yearly_price_usd
      : currency === "NGN"
        ? offering.price_ngn
        : offering.price_usd;
  const amount = Number(raw);
  return raw != null && amount > 0 ? amount : null;
}

/** "month" or "year", for sentences like "renews every year". */
export function intervalNoun(interval: BillingInterval | null | undefined): "month" | "year" {
  return interval === "yearly" ? "year" : "month";
}

/** A subscription's price spread over a month, for recurring-revenue totals. */
export function monthlyEquivalent(amount: number, interval: BillingInterval | null | undefined): number {
  return interval === "yearly" ? Math.round((amount / 12) * 100) / 100 : amount;
}

export function newTxRef(): string {
  return `sub_${nanoid(20)}`;
}

export function newCertificateTxRef(): string {
  return `cert_${nanoid(20)}`;
}

// Printed and typed by people, so no characters that are easily confused.
const certificateCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 10);

export function newCertificateCode(): string {
  return `CI-${certificateCode()}`;
}

/**
 * The currency to charge. Naira prices are for learners in Nigeria, so a
 * request for NGN is only honoured when the visitor's country (from the
 * x-vercel-ip-country header) is NG. Without the header (local development)
 * the requested currency is used.
 */
export function resolveCurrency(requested: Currency, country: string | null | undefined): Currency {
  if (requested !== "NGN") return "USD";
  if (!country) return "NGN";
  return country.toUpperCase() === "NG" ? "NGN" : "USD";
}

export interface ExpectedCharge {
  tx_ref: string;
  currency: string;
  amount: number | string;
}

export interface VerifiedCharge {
  tx_ref: string;
  status: string;
  currency: string;
  amount: number;
}

/** Why a verified transaction doesn't pay for this order, or null if it does. */
export function chargeProblem(expected: ExpectedCharge, tx: VerifiedCharge): string | null {
  if (tx.status !== "successful") return `Transaction status is ${tx.status}`;
  if (tx.tx_ref !== expected.tx_ref) return `tx_ref ${tx.tx_ref} doesn't match ${expected.tx_ref}`;
  if (tx.currency !== expected.currency) return `Paid in ${tx.currency}, expected ${expected.currency}`;
  if (Number(tx.amount) < Number(expected.amount)) return `Paid ${tx.amount}, expected ${expected.amount}`;
  return null;
}

export interface RenewalCandidate {
  id: string;
  first_tx_ref: string;
  currency: string;
  amount: number | string;
  current_period_end: string;
}

/**
 * Which live subscription a renewal charge belongs to. Flutterwave doesn't
 * document the tx_ref it uses for renewals or include the plan in the
 * transaction, so callers pass the learner's live subscriptions (matched by
 * customer email) and this narrows them down:
 *   1. a tx_ref that starts with the subscription's first tx_ref;
 *   2. otherwise same currency and amount, preferring the one due soonest.
 * When a learner has two identical subscriptions the soonest-due one is
 * extended; over a billing cycle both are, so the outcome is the same.
 */
export function matchRenewal<T extends RenewalCandidate>(
  candidates: T[],
  tx: { tx_ref: string; currency: string; amount: number }
): T | null {
  const byRef = candidates.filter((c) => tx.tx_ref && tx.tx_ref.startsWith(c.first_tx_ref));
  if (byRef.length === 1) return byRef[0];

  const pool = byRef.length > 1 ? byRef : candidates;
  const matching = pool
    .filter((c) => c.currency === tx.currency && Number(c.amount) === Number(tx.amount))
    .sort((a, b) => new Date(a.current_period_end).getTime() - new Date(b.current_period_end).getTime());
  return matching[0] ?? null;
}

export interface SubscriptionState {
  status: "active" | "past_due" | "cancelled" | "expired";
  current_period_end: string;
}

/** Whether a subscription still pays for a seat right now (period end plus grace). */
export function subscriptionCovers(sub: SubscriptionState | null | undefined, now: Date = new Date()): boolean {
  if (!sub || sub.status === "expired") return false;
  return new Date(sub.current_period_end).getTime() + GRACE_MS > now.getTime();
}

/**
 * Whether an enrolment gives access to live classes and recordings. Seats
 * paid by subscription need it to be paid up; manual, scholarship-code and
 * one-off enrolments always do.
 */
export function hasSeatAccess(
  enrollment: { source?: string | null },
  subscription: SubscriptionState | null | undefined,
  now: Date = new Date()
): boolean {
  if (enrollment.source !== "subscription") return true;
  return subscriptionCovers(subscription, now);
}

export function formatMoney(amount: number | string, currency: string): string {
  const value = Number(amount);
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
