import React from "react";
import "./globals.css";
import "./styles/anti-gravity.css";
import Navbar from "@/app/components/Navbar";
import UserAiChatbot from "@/app/components/UserAiChatbot";
import { auth } from "@/auth";

export const metadata = {
  title: "NextShop E-commerce Marketplace",
  description: "High-performance Next.js full-stack platform application",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-950 antialiased selection:bg-indigo-500 selection:text-white">
        <Navbar session={session} />
        <main className="w-full">
          {children}
        </main>
        <UserAiChatbot />
      </body>
    </html>
  );
}