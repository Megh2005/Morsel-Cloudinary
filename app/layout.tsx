import type { Metadata } from "next";
import { Roboto_Slab } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/Providers";
import LanguageSelector from "@/components/LanguageSelector";
import BackgroundPattern from "@/components/BackgroundPattern";
import DockNav from "@/components/DockNav";

const turret = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Morsel",
  description: "Don't let food go to waste, save every morsel",
};

import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${turret.className} relative min-h-screen flex flex-col`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TooltipProvider>
              <BackgroundPattern />
              {/* Floating Language Dropdown in top right */}
              <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-50">
                <LanguageSelector />
              </div>
              <Suspense fallback={null}>
                <main className="flex-1 pb-28 sm:pb-24">{children}</main>
                <DockNav />
              </Suspense>
            </TooltipProvider>
          </AuthProvider>
          <ToastContainer
            autoClose={2000}
            position="top-right"
            theme="light"
            closeOnClick={true}
            pauseOnHover={true}
            hideProgressBar={false}
            newestOnTop={true}
            transition={Slide}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
