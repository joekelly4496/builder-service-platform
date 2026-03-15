/**
 * Stripe API helper — uses fetch directly (no SDK dependency).
 * All calls go through this helper so auth and error handling are centralized.
 */

const STRIPE_API = "https://api.stripe.com/v1";

function getAuthHeader(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export async function stripeRequest<T = any>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, string>
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
  };

  const options: RequestInit = { method, headers };

  if (body && method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(`${STRIPE_API}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    console.error("Stripe API error:", data);
    throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  }

  return data as T;
}

/**
 * Report metered usage to Stripe for a subscription item.
 * Used for per-message SMS billing.
 */
export async function reportUsage(subscriptionItemId: string, quantity: number): Promise<void> {
  await stripeRequest("/subscription_items/" + subscriptionItemId + "/usage_records", "POST", {
    quantity: String(quantity),
    action: "increment",
    timestamp: String(Math.floor(Date.now() / 1000)),
  });
}
