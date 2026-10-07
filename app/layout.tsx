import type { Metadata } from "next";
import Script from "next/script";

import ToastContainer from "@/components/ui/Toast";
import LoginTransition from "@/components/ui/LoginTransition";
import ScrollToTop from "@/components/ui/ScrollToTop";

import "./globals.css";

export const metadata: Metadata = {
    title: "ShopEasy - Premium Online Shopping",
    description:
        "Discover premium products at unbeatable prices. Shop with confidence, free shipping, and hassle-free returns.",
};

const themeScript = `
(function () {
    try {
        var saved = localStorage.getItem("theme");

        if (saved === "dark") {
            document.documentElement.classList.add("dark");
        } else if (saved === "light") {
            document.documentElement.classList.remove("dark");
        }
    } catch (e) {}
})();
`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className="antialiased"
            suppressHydrationWarning
        >
            <head>
                <Script
                    id="theme-script"
                    strategy="beforeInteractive"
                >
                    {themeScript}
                </Script>
            </head>

            <body suppressHydrationWarning>
                <ScrollToTop />

                {children}

                <ToastContainer />
                <LoginTransition />
            </body>
        </html>
    );
}