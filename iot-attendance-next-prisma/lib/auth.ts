import type { NextAuthOptions } from "next-auth";
import { UserRole } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user) return null;

        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = (token.role as UserRole | undefined) ?? UserRole.VIEWER;
      }
      return session;
    }
  }
};
