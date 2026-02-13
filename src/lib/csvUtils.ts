export function generateCsv(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return `${headers}\n${rows}`;
}
