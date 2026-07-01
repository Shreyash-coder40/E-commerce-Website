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

    let phone = phoneNumber.trim().replace(/\s+/g, "");
    if (phone.length < 8) {
      return NextResponse.json(
        { error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    // Smart formatting: Auto-prepend +91 for 10-digit Indian numbers
    if (/^\d{10}$/.test(phone)) {
      phone = `+91${phone}`;
    } else if (/^\d{12}$/.test(phone) && phone.startsWith("91")) {
      phone = `+${phone}`;
    } else if (!phone.startsWith("+")) {
      phone = `+${phone}`;
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

    // Dispatch live SMS via Twilio if environment keys are present
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && twilioPhone) {
      const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioPhone,
            Body: `Your NextShop verification code is: ${otpCode}. Valid for 5 minutes.`,
          }),
        }
      );

      if (!twilioRes.ok) {
        const errData = await twilioRes.json();
        console.error("Twilio send message call failed:", errData);
        return NextResponse.json(
          { error: errData.message || "Failed to dispatch SMS through Twilio." },
          { status: 500 }
        );
      }

      console.log(`[Twilio SMS Gateway] OTP SMS dispatched successfully to ${phone}`);
    } else {
      // Fallback logging in local development mode
      console.log(`[SMS Gateway Mock Fallback] Phone: ${phone}, OTP: ${otpCode}`);
    }

    // Return success without returning the otpCode inside the JSON response for maximum security
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error: any) {
    console.error("OTP send error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
