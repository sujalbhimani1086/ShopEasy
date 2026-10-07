import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type PageLayoutProps = {
    children: ReactNode;
};

/**
 * Reusable page layout wrapper that wraps content with
 * Navbar + Footer. Eliminates duplicate Navbar/Footer
 * imports across every page.
 */
export default function PageLayout({ children }: PageLayoutProps) {
    return (
        <>
            <Navbar />
            <main className="page-content">
                {children}
            </main>
            <Footer />
        </>
    );
}
