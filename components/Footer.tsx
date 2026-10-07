"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();

    const isAdminPage = pathname?.startsWith("/admin");

    if (isAdminPage) {
        return (
            <footer className="footer" style={{ padding: "var(--space-6) 0" }}>
                <div
                    className="footer-bottom"
                    style={{
                        marginTop: 0,
                        borderTop: "none",
                        padding: "0 var(--space-6)",
                    }}
                >
                    <p>© 2026 ShopEasy. All Rights Reserved.</p>
                </div>
            </footer>
        );
    }

    return (
        <footer className="footer">
            <div className="footer-content">
                {/* BRAND */}
                <div className="footer-brand">
                    <h3>ShopEasy</h3>
                    <p>
                        Your destination for premium products at unbeatable
                        prices. Shop with confidence and convenience.
                    </p>
                </div>

                {/* QUICK LINKS */}
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li>
                            <Link href="/">Home</Link>
                        </li>
                        <li>
                            <Link href="/products">Products</Link>
                        </li>
                        <li>
                            <Link href="/cart">Cart</Link>
                        </li>
                        <li>
                            <Link href="/discount">Discounts</Link>
                        </li>
                    </ul>
                </div>

                {/* SUPPORT */}
                <div className="footer-section">
                    <h4>Support</h4>
                    <ul>
                        <li>
                            <Link href="/login">Login</Link>
                        </li>
                        <li>
                            <Link href="/register">Register</Link>
                        </li>
                        <li>
                            <Link href="/admin">Admin</Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2026 ShopEasy. All Rights Reserved.</p>
            </div>
        </footer>
    );
}