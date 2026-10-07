import Link from "next/link";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import ProductList from "@/components/ProductList";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import Footer from "@/components/Footer";
import SectionHeader from "@/components/ui/SectionHeader";
import { getCategoryBannerProducts, getProductsData } from "@/lib/products";

export default async function Home() {
    const [bannerProducts, initialData] = await Promise.all([
        getCategoryBannerProducts(),
        getProductsData({
            page: 1,
            limit: 12,
        }),
    ]);

    return (
        <>
            <Navbar />

            <Hero initialProducts={bannerProducts} />

            <Features />

            <section className="container section">
                <SectionHeader
                    title="Featured Products"
                    subtitle="Handpicked products just for you"
                />

                <Suspense
                    fallback={
                        <div className="product-grid">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <ProductCardSkeleton key={index} />
                            ))}
                        </div>
                    }
                >
                    <ProductList
                        featured
                        initialData={initialData}
                    />
                </Suspense>

                <div
                    className="text-center"
                    style={{ marginTop: "2.5rem" }}
                >
                    <Link
                        href="/products"
                        className="btn btn-secondary btn-lg"
                    >
                        Browse All Products →
                    </Link>
                </div>
            </section>

            <Footer />
        </>
    );
}