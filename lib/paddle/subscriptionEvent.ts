const SUBSCRIPTION_EVENT_TYPES = new Set([
  "subscription.activated",
  "subscription.canceled",
  "subscription.created",
  "subscription.imported",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.trialing",
  "subscription.updated",
]);

const SUBSCRIPTION_STATUSES = new Set([
  "active",
  "canceled",
  "past_due",
  "paused",
  "trialing",
]);

type UnknownRecord = Record<string, unknown>;

export type PaddleSubscriptionEventRecord = {
  customerId: string;
  nextBilledAt: string | null;
  priceId: string | null;
  scheduledChange: string | null;
  status: string;
  subscriptionId: string;
  userId: string | null;
};

export function isPaddleSubscriptionEvent(eventType: string) {
  return SUBSCRIPTION_EVENT_TYPES.has(eventType);
}

export function parsePaddleSubscriptionEvent(
  data: unknown,
): PaddleSubscriptionEventRecord | null {
  if (!isRecord(data)) return null;

  const subscriptionId = stringValue(data.id);
  const customerId = stringValue(data.customerId);
  const status = stringValue(data.status);

  if (
    !subscriptionId
    || !customerId
    || !status
    || !SUBSCRIPTION_STATUSES.has(status)
  ) {
    return null;
  }

  const customData = isRecord(data.customData) ? data.customData : null;
  const rawUserId = customData
    ? stringValue(customData.supabase_user_id)
    : null;

  return {
    customerId,
    nextBilledAt: nullableStringValue(data.nextBilledAt),
    priceId: getFirstPriceId(data.items),
    scheduledChange: getScheduledChange(data.scheduledChange),
    status,
    subscriptionId,
    userId: rawUserId && isUuid(rawUserId) ? rawUserId : null,
  };
}

function getFirstPriceId(items: unknown) {
  if (!Array.isArray(items)) return null;

  for (const item of items) {
    if (!isRecord(item) || !isRecord(item.price)) continue;
    const priceId = stringValue(item.price.id);
    if (priceId) return priceId;
  }

  return null;
}

function getScheduledChange(value: unknown) {
  if (!isRecord(value)) return null;
  const action = stringValue(value.action);
  return action && ["cancel", "pause", "resume"].includes(action)
    ? action
    : null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableStringValue(value: unknown) {
  return value === null ? null : stringValue(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
