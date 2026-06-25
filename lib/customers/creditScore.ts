/** حساب Score ائتماني مبسط (واجهة — يُحسّن لاحقاً مع بيانات فعلية) */

export function computeCreditScore(profile: Record<string, string | number | boolean>): number {
  let score = 50;
  const salary = Number(profile.salary) || 0;
  if (salary >= 15000) score += 15;
  else if (salary >= 8000) score += 8;
  else if (salary > 0) score += 3;

  const risk = String(profile.risk_rating || 'medium');
  if (risk === 'low') score += 20;
  if (risk === 'high') score -= 15;
  if (risk === 'blocked') score = 10;

  const children = Number(profile.children_count) || 0;
  if (children <= 2) score += 5;

  const limit = Number(profile.credit_limit) || 0;
  if (limit > 0 && limit <= 50000) score += 5;

  return Math.max(0, Math.min(100, score));
}
