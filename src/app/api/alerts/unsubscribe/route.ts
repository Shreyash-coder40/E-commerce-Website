import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      // Try to parse from body if not in query params
      try {
        const body = await req.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: "Subscription ID is required to unsubscribe." }, { status: 400 });
    }

    await db.alertSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Successfully unsubscribed from alert." });
  } catch (error: any) {
    console.error("UNSUBSCRIBE_ALERT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to unsubscribe from alert." }, { status: 500 });
  }
}
