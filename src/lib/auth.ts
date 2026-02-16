import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

const env = getEnv();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // Required for next-auth middleware to authorize protected routes.
  session: { strategy: "jwt" },
  debug: env.NEXTAUTH_DEBUG,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  ],
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = (token?.sub ?? user?.id ?? "") as string;
      }
      return session;
    }
  }
};
