import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { connectMongo, User } from '../src/models';

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
        const user: any = await User.findOne({ email: String(credentials.email).trim().toLowerCase() }).lean();
        if (!user || !user.password || user.password !== String(credentials.password)) return null;

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
      if (account?.provider !== 'google') return true;
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
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'PARENT';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = String(token.id || '');
        (session.user as any).role = String(token.role || 'PARENT');
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};
