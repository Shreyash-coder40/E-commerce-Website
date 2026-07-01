import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const addresses = await db.address.findMany({
      where: { userId: dbUser.id },
      orderBy: { isDefault: "desc" },
    });

    return NextResponse.json({ success: true, addresses });
  } catch (error: any) {
    console.error("GET_ADDRESSES_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { recipientName, phone, streetAddress, apartment, city, state, zipCode, isDefault } = body;

    if (!recipientName || !phone || !streetAddress || !city || !state || !zipCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If setting as default, update other addresses
    if (isDefault) {
      await db.address.updateMany({
        where: { userId: dbUser.id },
        data: { isDefault: false },
      });
    }

    const address = await db.address.create({
      data: {
        userId: dbUser.id,
        recipientName,
        phone,
        streetAddress,
        apartment,
        city,
        state,
        zipCode,
        isDefault: !!isDefault,
      },
    });

    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    console.error("POST_ADDRESS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to create address" }, { status: 500 });
  }
}
