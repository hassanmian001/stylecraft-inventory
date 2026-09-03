export const defaultCurrencySymbol = "Rs.";

export function formatCurrency(cents: number, currencySymbol = defaultCurrencySymbol) {
  return `${currencySymbol} ${(cents / 100).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
