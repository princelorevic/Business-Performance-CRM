// CSV with spreadsheet-formula-injection protection (cells starting with = + - @ are prefixed).
const esc = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(columns, rows, total) {
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(columns.map((c) => esc(r[c])).join(','));
  if (total !== undefined) lines.push(`Total,${esc(total)}`);
  return lines.join('\n') + '\n';
}
