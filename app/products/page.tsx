import { Suspense } from "react";
import PageLayout from "@/components/layout/PageLayout";
import ProductList from "@/components/ProductList";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import SectionHeader from "@/components/ui/SectionHeader";
import { getProductsData } from "@/lib/products";

type ProductsPageProps = {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        search?: string;
        category?: string;
        sort?: string;
    }>;
};

export default async function Products({ searchParams }: ProductsPageProps) {
    const resolvedParams = (await searchParams) || {};
    const page = Math.max(
        1,
        Number.parseInt(resolvedParams.page || "1", 10) || 1
    );
    const limit = Math.min(
        50,
        Math.max(
            1,
            Number.parseInt(resolvedParams.limit || "12", 10) || 12
        )
    );
    const search = (resolvedParams.search || "").trim();
    const category = resolvedParams.category || "all";
    const sort = resolvedParams.sort || "default";

    const initialData = await getProductsData({
        page,
        limit,
        search,
        category,
        sort,
    });

    return (
        <PageLayout>
            <section className="container">
                <SectionHeader
                    title="All Products"
                    subtitle="Browse our complete collection"
                />

                {/* Structured JSON data embedded in the document */}
                <script
                    id="products-structured-data"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "ItemList",
                            numberOfItems: initialData.products.length,
                            total: initialData.total,
                            page: initialData.page,
                            itemListElement: initialData.products.map(
                                (item, index) => ({
                                    "@type": "ListItem",
                                    position: index + 1,
                                    item: {
                                        "@type": "Product",
                                        id: item.id,
                                        name: item.name,
                                        price: item.price,
                                        discount: item.discount,
                                        category: item.category,
                                        image: item.image,
                                        stock: item.stock,
                                    },
                                })
                            ),
                        }),
                    }}
                />

                <Suspense
                    fallback={
                        <div className="product-grid">
                            {Array.from({ length: limit || 12 }).map((_, index) => (
                                <ProductCardSkeleton key={index} />
                            ))}
                        </div>
                    }
                >
                    <ProductList
                        initialData={initialData}
                        initialFilters={{
                            search,
                            category,
                            sort,
                            page,
                            limit,
                        }}
                    />
                </Suspense>
            </section>
        </PageLayout>
    );
}
