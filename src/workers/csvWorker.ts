
self.onmessage = (e) => {
  const { data } = e.data;
  if (!data || !Array.isArray(data)) {
    self.postMessage({ error: 'Invalid data format' });
    return;
  }

  try {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;

    self.postMessage({ csv: csvContent });
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
