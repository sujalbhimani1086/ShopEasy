import Link from "next/link";
import PageLayout from "@/components/layout/PageLayout";

export default function OrderSuccess() {
    return (
        <PageLayout>
            <section className="container">
                <div className="success-container">
                    <div className="success-card">
                        <div className="success-icon">🎉</div>

                        <h2>Order Placed Successfully!</h2>

                        <p>Thank you for shopping with ShopEasy.</p>
                        <p>Your order has been confirmed and will be delivered soon.</p>

                        <div className="success-actions" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <Link
                                href="/orders"
                                className="btn btn-secondary btn-lg"
                            >
                                📦 View Orders & Download Invoice
                            </Link>

                            <Link
                                href="/products"
                                className="btn btn-primary btn-lg"
                            >
                                Continue Shopping →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </PageLayout>
    );
}