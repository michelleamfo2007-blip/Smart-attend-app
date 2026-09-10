export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeLevel(value?: string | null) {
  if (!value) return '';
  return value.toLowerCase().replace(/level\s*/g, '').trim();
}

export function normalizeSemester(value?: string | null) {
  if (!value) return '';
  const cleaned = value.toLowerCase().replace(/semester/g, '').trim();
  if (cleaned === '1' || cleaned === 'first' || cleaned === 'i') return '1';
  if (cleaned === '2' || cleaned === 'second' || cleaned === 'ii') return '2';
  return cleaned;
}

export function levelsMatch(a?: string | null, b?: string | null) {
  const left = normalizeLevel(a);
  const right = normalizeLevel(b);
  return Boolean(left && right && left === right);
}

export function semestersMatch(a?: string | null, b?: string | null) {
  const left = normalizeSemester(a);
  const right = normalizeSemester(b);
  return Boolean(left && right && left === right);
}

export function shouldEnforceGps() {
  return process.env.ATTENDANCE_SKIP_GPS !== 'true';
}
