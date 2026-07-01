import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./app/lib/db";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phoneNumber: { label: "Phone Number", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        // Mode A: OTP Authentication
        if (credentials?.phoneNumber && credentials?.otp) {
          const phoneNumber = credentials.phoneNumber as string;
          const otpCode = credentials.otp as string;

          const user = await db.user.findUnique({
            where: { phone: phoneNumber },
          });

          if (!user || !user.otpCode || !user.otpExpiry) {
            return null;
          }

          const now = new Date();
          if (now > user.otpExpiry || user.otpCode !== otpCode) {
            return null;
          }

          // Clear OTP after successful verification to prevent replay attacks
          await db.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiry: null },
          });

          return user;
        }

        // Mode B: Standard Password Authentication
        if (credentials?.email && credentials?.password) {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string, 
            user.password
          );
    
          if (!isValid) {
            return null;
          }

          return user;
        }

        return null;
      },
    }),
  ],
});