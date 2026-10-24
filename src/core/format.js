export function money(n, { sign = false, decimals } = {}) {
  const v = Number(n) || 0;
  const d = decimals ?? (Math.abs(v % 1) > 0.001 ? 2 : 0);
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const prefix = v < 0 ? '-' : sign && v > 0 ? '+' : '';
  return `${prefix}฿${s}`;
}

export function pct(p) {
  return `${Math.round((p || 0) * 100)}%`;
}

export function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
