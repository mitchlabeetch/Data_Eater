const env = import.meta.env || {};
const API_URL = env.VITE_CLOUD_LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
const API_KEY = env.VITE_CLOUD_LLM_API_KEY || '';

export const processBatch = async (
  query: string, 
  dataBatch: any[], 
  _instructions: string
): Promise<any[]> => {
  if (!API_KEY) {
    // Mock Implementation if no key
    console.warn("No API Key found for Cloud LLM. Simulating response.");
    await new Promise(r => setTimeout(r, 1000));
    return dataBatch.map(row => ({
      ...row,
      _llm_comment: `Processed (Simulation): ${query}`
    }));
  }

  try {
    // 1. Convert Batch to CSV string for Prompt
    // Simple robust CSV conversion
    const headers = Object.keys(dataBatch[0] || {}).join(',');
    const rows = dataBatch.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;

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
  const results: any[][] = new Array(totalChunks);

  const concurrencyLimit = 4;
  const processing = new Set<Promise<void>>();
  let completedChunks = 0;

  const processChunk = async (index: number, chunk: any[]) => {
    try {
      const result = await processBatch(userQuery, chunk, "");
      results[index] = result;
    } finally {
      completedChunks++;
      onProgress(Math.round((completedChunks / totalChunks) * 100));
    }
  };

  for (let i = 0; i < totalChunks; i++) {
    const chunk = fullData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    
    if (processing.size >= concurrencyLimit) {
      await Promise.race(processing);
    }

    const p = processChunk(i, chunk);
    const wrapper = p.then(() => {
      processing.delete(wrapper);
    });
    processing.add(wrapper);
  }

  await Promise.all(processing);

  // Flatten results while filtering out any undefined slots (safety check)
  return results.flat().filter(item => item !== undefined);
};