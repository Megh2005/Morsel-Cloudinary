import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    
    interface Session {
        user: {
            /** The user's unique identifier */
            id: string;
            /** The user's avatar URL */
            avatar?: string;
        } & DefaultSession["user"];
    }

    interface User {
        avatar?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        avatar?: string;
    }
}
