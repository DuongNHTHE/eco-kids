import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { connectMongo, User } from '../src/models';
import { writeAuditLog } from '../src/audit';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        await connectMongo();
        const email = String(credentials.email).trim().toLowerCase();
        const user: any = await User.findOne({ email }).lean();
        if (!user || !user.password || user.password !== String(credentials.password)) {
          await writeAuditLog({
            action: 'LOGIN_FAILURE',
            resource: 'AUTH_SESSION',
            actor: { email },
            metadata: { provider: 'credentials' },
            success: false,
          });
          return null;
        }

        return {
          id: String(user._id || user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar || null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') {
        await writeAuditLog({
          action: 'LOGIN_SUCCESS',
          resource: 'AUTH_SESSION',
          actor: { userId: user.id, email: user.email, role: (user as any).role },
          metadata: { provider: account?.provider || 'credentials' },
        });
        return true;
      }
      if (!user.email) return false;

      await connectMongo();
      const email = user.email.trim().toLowerCase();
      const existing: any = await User.findOne({ email }).lean();
      const googleName = user.name || String(profile?.name || '').trim() || email.split('@')[0];

      if (existing) {
        await User.updateOne(
          { _id: existing._id },
          { $set: { name: googleName, avatar: user.image || existing.avatar || '', updatedAt: new Date() } }
        );
        (user as any).id = String(existing._id || existing.id);
        (user as any).role = existing.role || 'PARENT';
        await writeAuditLog({
          action: 'LOGIN_SUCCESS',
          resource: 'AUTH_SESSION',
          actor: { userId: (user as any).id, email, role: (user as any).role },
          metadata: { provider: 'google' },
        });
        return true;
      }

      const created: any = await User.create({
        email,
        name: googleName,
        avatar: user.image || '',
        role: 'PARENT',
        updatedAt: new Date(),
      });
      (user as any).id = String(created._id || created.id);
      (user as any).role = 'PARENT';
      await writeAuditLog({
        action: 'LOGIN_SUCCESS',
        resource: 'AUTH_SESSION',
        actor: { userId: (user as any).id, email, role: 'PARENT' },
        metadata: { provider: 'google', accountCreated: true },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'PARENT';
          token.image = user.image || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = String(token.id || '');
        (session.user as any).role = String(token.role || 'PARENT');
          (session.user as any).image = token.image || null;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};
