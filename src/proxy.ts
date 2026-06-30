import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user && (req.auth.user as any).role === "ADMIN";
  const { nextUrl } = req;

  // Protect admin dashboard routes
  if (nextUrl.pathname.startsWith("/admin")) {
    if (!isLoggedIn || !isAdmin) {
      console.log(`Proxy blocked access to ${nextUrl.pathname}. Redirecting to /login.`);
      return Response.redirect(new URL("/login", nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
