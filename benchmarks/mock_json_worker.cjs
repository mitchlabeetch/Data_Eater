const { parentPort } = require('worker_threads');

parentPort.on('message', (data) => {
  // Simulate JSON serialization work
  const json = JSON.stringify(data);
  const buffer = Buffer.from(json);
  parentPort.postMessage({ buffer });
});
