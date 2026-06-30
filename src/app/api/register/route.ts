import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/app/lib/db" // Exact relative path matching your folder tree

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please fill out all required fields." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Verify if user exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This email address is already registered." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user profile
    const newUser = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    const { password: _, ...secureUserObject } = newUser;

    return NextResponse.json(
      { 
        message: "User account created successfully!", 
        user: secureUserObject 
      },
      { status: 201 }
    );

  } catch (error: any) {
    // This logs the precise hidden system crash inside your VS Code terminal
    console.error("REGISTRATION_API_CRASH_LOG:", error);
    
    return NextResponse.json(
      { error: `Database Error: ${error.message || "Initialization failure"}` },
      { status: 500 }
    );
  }
}