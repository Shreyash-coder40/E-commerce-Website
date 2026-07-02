import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AiAssistantConsole from "@/app/components/AiAssistantConsole";

export const revalidate = 0; // Forces Next.js to check credentials fresh

export default async function AiAssistantConsolePage() {
  // 1. Secure server-side validation layer
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) {
    redirect("/");
  }

  // 2. Render dedicated workspace console component for admin
  return <AiAssistantConsole />;
}
