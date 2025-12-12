const Z = {
  "0.90": 1.28,
  "0.95": 1.65,
  "0.97": 1.88,
  "0.99": 2.33
};

export function computeMetrics(item) {
  const dailyDemand = Number(item.dailyDemand || 0);
  const leadTimeDays = Number(item.leadTimeDays || 0);
  const currentStock = Number(item.currentStock || 0);
  const unitCost = Number(item.unitCost || 0);
  const demandStdDev = Number(item.demandStdDev || 0);

  const z = Z[item.serviceLevel] ?? 1.65;
  const leadTimeDemand = dailyDemand * leadTimeDays;

  const safetyStock =
    demandStdDev > 0
      ? round2(z * demandStdDev * Math.sqrt(leadTimeDays))
      : round2(0.1 * leadTimeDemand);

  const reorderPoint = round2(leadTimeDemand + safetyStock);
  const daysOfStock = dailyDemand > 0 ? round2(currentStock / dailyDemand) : 0;
  const annualUsageValue = round2(dailyDemand * 365 * unitCost);

  const status =
    currentStock <= reorderPoint
      ? "REORDER_NOW"
      : currentStock <= reorderPoint * 1.2
      ? "LOW_SOON"
      : "OK";

  return { safetyStock, reorderPoint, daysOfStock, annualUsageValue, status };
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
