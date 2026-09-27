import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req: NextRequestWithAuth) {
        const { pathname } = req.nextUrl;
        const isAuth = !!req.nextauth.token;

        // Only the homepage ("/") and the login/auth page ("/auth") can be accessed without authentication
        const isPublicPage = pathname === "/" || pathname.startsWith("/auth");

        if (isPublicPage) {
            return NextResponse.next();
        }

        if (!isAuth) {
            const url = req.nextUrl.clone();
            url.pathname = "/auth";
            url.search = "";
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: () => true,
        },
        pages: {
            signIn: "/auth",
        },
    }
);

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
