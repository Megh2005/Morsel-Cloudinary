import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "@/lib/services";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await getUserByEmail(credentials.email);

                if (!user) {
                    throw new Error("Invalid credentials");
                }

                const isCorrectPassword = await verifyPassword(
                    credentials.password,
                    user.password
                );

                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/auth",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }: any) {
            // Initial sign in - user object is available
            if (user) {
                token.avatar = user.avatar;
            }

            // Session update triggered - fetch fresh data from database
            if (trigger === "update") {
                const { getUserById } = await import("@/lib/services");
                const freshUser = await getUserById(token.sub);

                if (freshUser) {
                    token.name = freshUser.name;
                    token.email = freshUser.email;
                    token.avatar = freshUser.avatar;
                }
            }

            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.sub;
                session.user.avatar = token.avatar;
            }
            return session;
        },
    },
};
