import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";
import { fetchGemini } from "@/app/lib/gemini";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // 1. Verify admin session security
    const session = await auth();
    const isAdmin = (session?.user as any)?.role === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
    }

    // 2. Fetch target order and customer orders history for metrics
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          include: {
            orders: {
              select: { id: true, totalAmount: true, status: true, isPaid: true }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const customer = order.user;
    const userOrders = customer?.orders || [];
    const totalOrders = userOrders.length;
    const returnedOrdersCount = userOrders.filter(
      (o: any) => o.status === "RETURN_APPROVED" || o.status === "CANCELLED"
    ).length;
    
    const returnRate = totalOrders > 0 ? (returnedOrdersCount / totalOrders) * 100 : 0;

    // 3. Resolve the claim context details
    const isCancellation = order.status === "CANCELLATION_PENDING" || order.status === "CANCELLED";
    const claimReasonText = isCancellation ? order.cancellationReason : order.returnReason;

    // Parse the pipeline text format
    let reason = "None";
    let description = "";
    let imageUrl = "";

    if (claimReasonText) {
      const parts = claimReasonText.split(" | ");
      for (const part of parts) {
        if (part.startsWith("Reason: ")) {
          reason = part.replace("Reason: ", "");
        } else if (part.startsWith("Description: ")) {
          description = part.replace("Description: ", "");
        } else if (part.startsWith("Image: ")) {
          imageUrl = part.replace("Image: ", "");
        }
      }
      if (reason === "None" && !description) {
        reason = claimReasonText;
      }
    }

    // 4. Construct prompt for Gemini Fraud Forensics
    const prompt = `
      You are a Fraud Risk Specialist for NextShop E-commerce.
      Analyze the following return/cancellation request for potential buyer fraud (such as wardrobing, empty box claims, counterfeiting, or serial refund exploitation).

      [CUSTOMER LIFESTIME METRICS]
      - Customer Name: ${customer.name || "Guest"}
      - Customer Email: ${customer.email}
      - Total Orders Placed: ${totalOrders}
      - Total Returned/Cancelled Orders: ${returnedOrdersCount}
      - Lifetime Return/Cancellation Rate: ${returnRate.toFixed(1)}%

      [CURRENT REQUEST SPECIFICS]
      - Request Type: ${isCancellation ? "ORDER CANCELLATION" : "ORDER RETURN"}
      - Refund Request Value: ₹${order.totalAmount.toLocaleString("en-IN")}
      - Reason Selected: ${reason}
      - Additional Description Provided: "${description || "No details provided"}"
      - Proof Image Attached URL: ${imageUrl || "None provided"}

      Determine the fraud risk level ("LOW", "MEDIUM", or "HIGH"), extract specific risk signals, and write a forensic analysis.
      Respond strictly in JSON format matching this schema:
      {
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "fraudSignals": ["generic claim", "high lifetime return rate", "high request value", etc],
        "analysis": "forensic description explaining the rationale..."
      }
    `;

    // 5. Query Gemini model via our fast rotator (`fetchGemini`)
    try {
      const response = await fetchGemini("gemini-3.1-flash-lite", {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.0 }
      });

      const data = await response.json();
      let geminiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (geminiResponseText) {
        // Strip out markdown fences like ```json and ``` before parsing
        let cleanText = geminiResponseText.trim();
        if (cleanText.startsWith("```")) {
          const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match && match[1]) {
            cleanText = match[1].trim();
          } else {
            cleanText = cleanText.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "");
          }
        }

        const matchJson = cleanText.match(/\{[\s\S]*\}/);
        if (matchJson) {
          cleanText = matchJson[0];
        }

        const parsed = JSON.parse(cleanText);
        return NextResponse.json({
          riskLevel: parsed.riskLevel || (returnRate > 35 ? "HIGH" : "LOW"),
          fraudSignals: Array.isArray(parsed.fraudSignals) ? parsed.fraudSignals : ["AI Forensic Audit Completed"],
          analysis: parsed.analysis || "AI Fraud evaluation successfully completed."
        });
      }
    } catch (aiErr: any) {
      console.error("[Fraud Check] AI Scan error:", aiErr);
    }

    // Heuristics fallback if AI fails or returns invalid text
    return NextResponse.json({
      riskLevel: returnRate > 35 ? "HIGH" : returnRate > 15 ? "MEDIUM" : "LOW",
      fraudSignals: ["Heuristics Backup Audit Mode"],
      analysis: `AI evaluation fallback: Customer lifetime return rate is ${returnRate.toFixed(1)}% (${returnedOrdersCount} returns/cancellations across ${totalOrders} orders). Request refund amount: ₹${order.totalAmount.toLocaleString("en-IN")}.`
    });
  } catch (error: any) {
    console.error("FRAUD_CHECK_API_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze fraud" }, { status: 500 });
  }
}
