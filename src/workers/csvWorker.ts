import { generateCsv } from '../lib/csvUtils';

self.onmessage = (e: MessageEvent) => {
  const { id, data } = e.data;

  try {
    const csvContent = generateCsv(data);
    self.postMessage({ id, csv: csvContent });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
