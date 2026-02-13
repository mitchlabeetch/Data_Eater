import { generateCsv } from '../lib/csvUtils';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as any;
const API_URL = env.VITE_CLOUD_LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
const API_KEY = env.VITE_CLOUD_LLM_API_KEY || '';

// Worker Management
let csvWorker: Worker | null = null;
const pendingCsvRequests = new Map<string, { resolve: (csv: string) => void, reject: (err: any) => void }>();

function getCsvWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;

  if (!csvWorker) {
    try {
      csvWorker = new Worker(new URL('../workers/csvWorker.ts', import.meta.url), { type: 'module' });
      csvWorker.onmessage = (e) => {
        const { id, csv, error } = e.data;
        const callback = pendingCsvRequests.get(id);
        if (callback) {
          pendingCsvRequests.delete(id);
          if (error) callback.reject(new Error(error));
          else callback.resolve(csv);
        }
      };
      csvWorker.onerror = (e) => {
        console.error("CSV Worker Error:", e);
      };
    } catch (e) {
      console.warn("Failed to initialize CSV Worker", e);
      return null;
    }
  }
  return csvWorker;
}

async function generateCsvAsync(data: any[]): Promise<string> {
  const worker = getCsvWorker();
  if (!worker) {
     return generateCsv(data);
  }

  return new Promise((resolve, reject) => {
    // Simple ID generation
    const id = Math.random().toString(36).substring(2, 15);
    pendingCsvRequests.set(id, { resolve, reject });
    worker.postMessage({ id, data });
  });
}

export const processBatch = async (
  query: string, 
  dataBatch: any[], 
  _instructions: string
): Promise<any[]> => {
  // Materialize batch if needed (handle Arrow Proxies)
  // Check if this looks like Arrow data by testing first non-null element
  let safeBatch = dataBatch;
  if (dataBatch.length > 0) {
    const firstNonNull = dataBatch.find(r => r != null);
    if (firstNonNull && typeof firstNonNull.toJSON === 'function') {
      safeBatch = dataBatch.map(r => r ? r.toJSON() : r);
    }
  }

  if (!API_KEY) {
    // Mock Implementation if no key
    console.warn("No API Key found for Cloud LLM. Simulating response.");
    await new Promise(r => setTimeout(r, 1000));
    return safeBatch.map(row => ({
      ...row,
      _llm_comment: `Processed (Simulation): ${query}`
    }));
  }

  try {
    // 1. Convert Batch to CSV string for Prompt
    const csvContent = await generateCsvAsync(safeBatch);

    const systemPrompt = `
      You are an expert Data Engineer assistant for Robertet.
      Your task is to process a CSV dataset based on the user's request.
      
      RULES:
      1. Return ONLY valid JSON array of objects. No markdown, no comments.
      2. Maintain the 'data_eater_id' column exactly as is (CRITICAL for reconciliation).
      3. Apply transformations or create new columns as requested.
      4. If a value is unknown/missing, use null.
    `;

    const userPrompt = `
      User Request: "${query}"
      
      Data (CSV):
      ${csvContent}
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // or model from env
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Deterministic
        response_format: { type: "json_object" } 
      })
    });

    if (!response.ok) {
      throw new Error(`Cloud API Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const content = json.choices[0].message.content;
    
    // Robust parsing
    const result = JSON.parse(content);
    // Handle if API returns { "data": [...] } vs [...]
    const finalData = Array.isArray(result) ? result : (result.data || result.rows || []);
    
    return finalData;

  } catch (e) {
    console.error("Batch Processing Failed", e);
    // Fallback: return original to avoid losing data, but mark error?
    // Better to throw so the main loop handles retry/abort
    throw e;
  }
};

export const runSmartQuery = async (
  userQuery: string,
  fullData: any[],
  onProgress: (p: number) => void
): Promise<any[]> => {
  const CHUNK_SIZE = 500;
  const totalChunks = Math.ceil(fullData.length / CHUNK_SIZE);
  const allResults: any[][] = new Array(totalChunks);
  const CONCURRENCY_LIMIT = 5;
  const executing = new Set<Promise<void>>();

  let completedChunks = 0;

  for (let i = 0; i < totalChunks; i++) {
    const chunk = fullData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    
    const p = processBatch(userQuery, chunk, "").then((result) => {
      allResults[i] = result;
      completedChunks++;
      onProgress(Math.round((completedChunks / totalChunks) * 100));
    });

    const wrapper = p.then(() => {
      executing.delete(wrapper);
    });

    executing.add(wrapper);

    if (executing.size >= CONCURRENCY_LIMIT) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);

  // Flatten results securely
  const processedData: any[] = [];
  for (const batch of allResults) {
    if (batch) {
      processedData.push(...batch);
    }
  }

  return processedData;
};