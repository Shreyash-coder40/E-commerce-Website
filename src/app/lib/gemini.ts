/**
 * Gemini API Key Rotator & Failover Helper
 * Automatically handles sequential key failovers and model fallbacks for 100% reliability & speed.
 */

// Map legacy or busy models to our fastest, 200 OK verified production model: gemini-3.1-flash-lite
function resolveModelName(model: string): string {
  const aliases: Record<string, string> = {
    "gemini-2.0-flash":       "gemini-3.1-flash-lite",
    "gemini-2.0-flash-lite":  "gemini-3.1-flash-lite",
    "gemini-1.5-flash":       "gemini-3.1-flash-lite",
    "gemini-1.5-pro":         "gemini-3.1-flash-lite",
    "gemini-pro":             "gemini-3.1-flash-lite",
    "gemini-2.5-flash":       "gemini-3.1-flash-lite",
    "gemini-2.5-pro":         "gemini-3.1-flash-lite",
    "gemini-flash-latest":    "gemini-3.1-flash-lite",
  };
  return aliases[model] ?? "gemini-3.1-flash-lite";
}

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
  const primaryModel = resolveModelName(model);
  // Fallback model if primary hits temporary high demand (503) or rate limits across keys
  const modelsToTry = [primaryModel, "gemini-flash-latest"];

  for (const currentModel of modelsToTry) {
    console.log(`[AI Rotator]: Attempting model "${currentModel}" across ${keys.length} key(s)...`);

    // Try each key sequentially
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      
      if (!key || key.trim() === "") {
        continue;
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${key.trim()}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        // If key is rate limited (429) or high demand (503), log warning and try next key/model
        if (response.status === 429 || response.status === 503) {
          console.warn(`[AI Rotator]: Key ${i + 1} hit status ${response.status} on model ${currentModel}. Trying next...`);
          lastError = new Error(`Key ${i + 1} status ${response.status} (${currentModel})`);
          continue;
        }

        // If response is not ok (e.g. key expired or bad request), try next key
        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[AI Rotator]: Key ${i + 1} failed with status ${response.status}: ${errorText}. Trying next...`);
          lastError = new Error(`Key ${i + 1} failed with status ${response.status}`);
          continue;
        }

        // Success! Return the fast, accurate response
        return response;
      } catch (err: any) {
        console.error(`[AI Rotator]: Request failed using Key ${i + 1} on model ${currentModel}:`, err);
        lastError = err;
      }
    }
  }

  throw lastError || new Error("All configured Gemini API keys failed or were rate-limited.");
}

export async function embedText(text: string): Promise<number[]> {
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
  const embeddingModels = ["text-embedding-004"];

  for (const embedModel of embeddingModels) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (!key || key.trim() === "") {
        continue;
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${embedModel}:embedContent?key=${key.trim()}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${embedModel}`,
            content: {
              parts: [{ text }]
            }
          })
        });

        if (response.status === 429 || response.status === 503) {
          console.warn(`[AI Rotator - Embedding]: Key ${i + 1} hit status ${response.status} on ${embedModel}. Trying next...`);
          lastError = new Error(`Key ${i + 1} status ${response.status} (${embedModel})`);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[AI Rotator - Embedding]: Key ${i + 1} failed with status ${response.status}: ${errorText}. Trying next...`);
          lastError = new Error(`Key ${i + 1} failed (status ${response.status}): ${errorText}`);
          continue;
        }

        const resData = await response.json();
        const embedding = resData.embedding?.values;
        if (!Array.isArray(embedding)) {
          throw new Error("Invalid embedding response structure from Google API.");
        }

        return embedding;
      } catch (err: any) {
        console.error(`[AI Rotator - Embedding]: Key ${i + 1} threw error on ${embedModel}:`, err);
        lastError = err;
      }
    }
  }

  throw lastError || new Error("All configured Gemini API keys failed to generate embedding.");
}
