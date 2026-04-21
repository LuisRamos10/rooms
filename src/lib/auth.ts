import "server-only";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    orgId: string;
    orgName: string;
    role: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;

      const domain = profile.email.split("@")[1];
      const org = await prisma.organization.findUnique({
        where: { domain },
      });

      if (!org) return false;

      return true;
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { org: true },
      });

      if (dbUser?.org) {
        session.user.id = dbUser.id;
        session.orgId = dbUser.orgId!;
        session.orgName = dbUser.org.name;
        session.role = dbUser.role;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;

      const domain = user.email.split("@")[1];
      const org = await prisma.organization.findUnique({
        where: { domain },
      });

      if (org) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            orgId: org.id,
            googleId: user.id,
            role: "MEMBER",
          },
        });
      }
    },
  },
});
