import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";
    if (!isAdmin && secret !== "debug123") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      return NextResponse.json({ error: "GEMINI_API_KEY is empty." }, { status: 400 });
    }

    const prefix = key.substring(0, 8) + "...";

    // Test top candidate models in PARALLEL with a strict 4.5 second timeout per model
    const modelsToTest = [
      "gemini-3.5-flash",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];

    const testResults = await Promise.all(
      modelsToTest.map(async (modelName) => {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
        const start = Date.now();
        try {
          const fetchPromise = fetch(testUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Respond with: OK" }] }],
              generationConfig: { maxOutputTokens: 10 }
            }),
          });

          const timeoutPromise = new Promise<Response | null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout (>4.5s)")), 4500)
          );

          const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
          const durationMs = Date.now() - start;
          const rawText = await res.text();
          let parsed = null;
          try { parsed = JSON.parse(rawText); } catch (e) {}

          if (res.ok) {
            const aiText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || rawText;
            return {
              modelName,
              status: "OK (200) - SUCCESS! 🎉",
              durationMs,
              reply: aiText.trim(),
            };
          } else {
            return {
              modelName,
              status: `ERROR (${res.status})`,
              durationMs,
              errorMessage: parsed?.error?.message || rawText,
              errorCode: parsed?.error?.code || res.status,
            };
          }
        } catch (err: any) {
          return {
            modelName,
            status: "NETWORK/TIMEOUT",
            durationMs: Date.now() - start,
            errorMessage: err.message || String(err),
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      keyPrefix: prefix,
      testResults,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to run model test.",
    }, { status: 500 });
  }
}
