// formatters.ts — Number/date/unit formatters for display
export function formatWatts(watts: number): string {
  if (watts >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
}

export function formatRupees(amount: number): string {
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${Math.round(amount)}`;
}

export function formatKwh(kwh: number): string {
  return `${kwh.toFixed(2)} kWh`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}min ago`;
  return 'just now';
}

export function calcDailyCost(watts: number, ratePerKwh = 8): number {
  return (watts / 1000) * 24 * ratePerKwh;
}

export function calcMonthlyCost(watts: number, ratePerKwh = 8): number {
  return (watts / 1000) * 24 * 30 * ratePerKwh;
}

export function calcCarbon(watts: number): number {
  // 0.82 kg CO2 per kWh, Indian grid factor
  return (watts / 1000) * 24 * 30 * 0.82;
}
