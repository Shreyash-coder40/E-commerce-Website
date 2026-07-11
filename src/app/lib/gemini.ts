/**
 * Gemini API Key Rotator & Failover Helper
 * Automatically handles sequential key failovers when rate limits (429) or other errors are hit.
 */

export async function fetchGemini(
  model: string,
  body: {
    contents: any[];
    systemInstruction?: { parts: { text: string }[] };
    generationConfig?: any;
  }
) {
  // Load up to 5 keys from environment variables
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
  if (process.env.GEMINI_API_KEY_4) keys.push(process.env.GEMINI_API_KEY_4);
  if (process.env.GEMINI_API_KEY_5) keys.push(process.env.GEMINI_API_KEY_5);

  if (keys.length === 0) {
    throw new Error("No Gemini API keys are configured in environment variables.");
  }

  let lastError: any = null;

  // Try each key sequentially
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    
    // Safety check to avoid sending requests to empty string placeholders
    if (!key || key.trim() === "") {
      continue;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // If key is rate limited (429), log warning and continue to next key
      if (response.status === 429) {
        console.warn(`[AI Rotator]: Key ${i + 1} (prefix: ${key.substring(0, 5)}...) hit rate limits (429). Trying next key...`);
        lastError = new Error(`Key ${i + 1} rate limited (429)`);
        continue;
      }

      // If response is not ok (e.g. key is expired, inactive, or bad request), try next key
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[AI Rotator]: Key ${i + 1} failed with status ${response.status}: ${errorText}. Trying next key...`);
        lastError = new Error(`Key ${i + 1} failed with status ${response.status}`);
        continue;
      }

      // Success! Return the response
      return response;
    } catch (err: any) {
      console.error(`[AI Rotator]: Request failed using Key ${i + 1} due to network/server error:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("All configured Gemini API keys failed or were rate-limited.");
}
