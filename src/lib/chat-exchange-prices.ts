export const CHAT_EXCHANGE_PRICES = [
  48_500, 42_500, 42_000, 44_500, 53_000, 45_500, 45_000, 41_000, 48_500, 50_500, 49_500, 52_000,
] as const;

export function chatExchangePrice(personId: number) {
  if (!Number.isInteger(personId) || personId < 1 || personId > 52) {
    throw new RangeError("Chat profile is outside the configured range.");
  }

  return CHAT_EXCHANGE_PRICES[(personId - 1) % CHAT_EXCHANGE_PRICES.length];
}
