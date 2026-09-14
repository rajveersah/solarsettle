// Simulated smart-meter feed. It is deliberately labelled as simulated and is
// only used when a wallet/contract is unavailable; production values come from
// the on-chain meter workflow.
export function generateReading({ date = new Date(), capacityKw = 5, weatherFactor } = {}) {
  const timestamp = new Date(date);
  const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
  const peakHour = 13;
  const daylightCurve = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * 3.7 * 3.7));
  const seasonalFactor = 0.82 + ((Math.cos(((timestamp.getMonth() - 4) / 12) * Math.PI * 2) + 1) * 0.07);
  const cloudFactor = weatherFactor ?? (0.88 + Math.random() * 0.12);
  const kWh = Math.max(0, capacityKw * 4.4 * daylightCurve * seasonalFactor * cloudFactor);
  const roundedKwh = Number(kWh.toFixed(2));

  return {
    meterId: 'SIM-METER-001',
    timestamp: timestamp.toISOString(),
    // Both spellings keep the existing dashboards compatible while making the
    // display field explicit.
    kWh: roundedKwh,
    kwh: roundedKwh,
    expectedKwh: Number((capacityKw * 4.4 * daylightCurve * seasonalFactor).toFixed(2)),
    voltage: 224 + Math.floor(Math.random() * 8),
    status: 'simulated',
  };
}
