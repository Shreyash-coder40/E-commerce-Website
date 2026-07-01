import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const phone = phoneNumber.trim();
    if (phone.length < 8) {
      return NextResponse.json(
        { error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    // Generate 6-digit random code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Find or create user
    const existingUser = await db.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      await db.user.update({
        where: { id: existingUser.id },
        data: { otpCode, otpExpiry },
      });
    } else {
      // Auto-register on first sign-in
      const dummyEmail = `${phone.replace(/\+/g, "").replace(/\s/g, "")}@phone.placeholder`;
      
      const emailConflict = await db.user.findUnique({
        where: { email: dummyEmail },
      });

      const finalEmail = emailConflict 
        ? `${phone.replace(/\+/g, "").replace(/\s/g, "")}_${Date.now()}@phone.placeholder` 
        : dummyEmail;

      await db.user.create({
        data: {
          phone,
          email: finalEmail,
          name: `User ${phone}`,
          otpCode,
          otpExpiry,
        },
      });
    }

    // Simulate sending SMS by logging it to the console
    console.log(`[SMS Gateway Mock] OTP Code for ${phone}: ${otpCode}`);

    // Return the OTP code in the response to make manual testing convenient
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully.",
      otpCode,
    });
  } catch (error: any) {
    console.error("OTP send error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
