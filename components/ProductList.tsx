"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import ProductEntranceAnimation from "./ProductEntranceAnimation";
import Pagination from "@/components/ui/Pagination";
import ProductCountSelector from "@/components/ui/ProductCountSelector";
import EmptyState from "@/components/ui/EmptyState";
import Dropdown from "@/components/ui/Dropdown";
import type { Product } from "@/lib/types";

type ProductsResponse = {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    categories: string[];
};

type ProductListProps = {
    featured?: boolean;
    initialData?: ProductsResponse;
    initialFilters?: {
        search?: string;
        category?: string;
        sort?: string;
        page?: number;
        limit?: number;
    };
};

const PRODUCTS_PER_PAGE_OPTIONS = [
    4, 8, 12, 16, 20, 24, 32, 40, 50,
];

export default function ProductList({
    featured = false,
    initialData,
    initialFilters,
}: ProductListProps) {
    const searchParams = useSearchParams();

    const [products, setProducts] = useState<Product[]>(
        initialData?.products || []
    );

    const [categories, setCategories] = useState<string[]>(
        initialData?.categories || []
    );

    const [search, setSearch] = useState(
        initialFilters?.search || ""
    );

    const [debouncedSearch, setDebouncedSearch] = useState(
        initialFilters?.search || ""
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);

        return () => {
            clearTimeout(timer);
        };
    }, [search]);

    const [category, setCategory] = useState(
        initialFilters?.category ||
            (featured
                ? "all"
                : searchParams.get("category") || "all")
    );

    const [sort, setSort] = useState(
        initialFilters?.sort || "default"
    );

    const [loading, setLoading] = useState(
        !initialData
    );

    const [currentPage, setCurrentPage] = useState(
        initialFilters?.page || initialData?.page || 1
    );

    const [productsPerPage, setProductsPerPage] = useState(
        initialFilters?.limit || initialData?.limit || 12
    );

    const [totalProducts, setTotalProducts] = useState(
        initialData?.total || 0
    );

    const [totalPages, setTotalPages] = useState(
        initialData?.totalPages || 0
    );

    const isInitialDataLoaded = useRef(Boolean(initialData));
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (featured) return;

        const urlCategory =
            searchParams.get("category") || "all";

        setCategory((prev) => {
            if (prev !== urlCategory) {
                setCurrentPage(1);
                return urlCategory;
            }

            return prev;
        });
    }, [searchParams, featured]);

    useEffect(() => {
        if (isFirstRender.current) {
            return;
        }

        setCurrentPage(1);
    }, [debouncedSearch, category, sort, productsPerPage]);

    useEffect(() => {
        if (isInitialDataLoaded.current) {
            isInitialDataLoaded.current = false;
            isFirstRender.current = false;
            return;
        }

        isFirstRender.current = false;

        const controller = new AbortController();

        async function loadProducts() {
            setLoading(true);

            try {
                let url = "/api/products";

                if (!featured) {
                    const params = new URLSearchParams({
                        page: String(currentPage),
                        limit: String(productsPerPage),
                        search: debouncedSearch,
                        category,
                        sort,
                    });

                    url += `?${params.toString()}`;
                }

                const response = await fetch(url, {
                    signal: controller.signal,
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error(
                        "Failed to load products"
                    );
                }

                const data: ProductsResponse | Product[] =
                    await response.json();

                if (controller.signal.aborted) {
                    return;
                }

                const productList: Product[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.products)
                        ? data.products
                        : [];

                const categoryList: string[] =
                    !Array.isArray(data) && Array.isArray(data?.categories)
                        ? data.categories
                        : [];

                setProducts(productList);
                setCategories(categoryList);

                if (!featured) {
                    if (!Array.isArray(data)) {
                        setTotalProducts(data.total || 0);
                        setTotalPages(data.totalPages || 0);
                    } else {
                        setTotalProducts(productList.length);
                        setTotalPages(1);
                    }
                } else {
                    setTotalProducts(productList.length);
                    setTotalPages(1);
                }
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name === "AbortError"
                ) {
                    return;
                }

                console.error(
                    "Failed to load products:",
                    error
                );

                if (!controller.signal.aborted) {
                    setProducts([]);
                    setTotalProducts(0);
                    setTotalPages(0);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadProducts();

        return () => controller.abort();
    }, [
        featured,
        currentPage,
        productsPerPage,
        debouncedSearch,
        category,
        sort,
    ]);

    const featuredProducts = useMemo(() => {
        if (!featured) return [];

        const selected: Product[] = [];
        const featuredBase = products.slice(0, 4);

        for (const product of featuredBase) {
            if (selected.length >= 4) break;

            if (product.stock > 0) {
                selected.push(product);
                continue;
            }

            const replacement = products.find(
                (item) =>
                    item.category === product.category &&
                    item.stock > 0 &&
                    !selected.some(
                        (selectedProduct) =>
                            selectedProduct.id === item.id
                    )
            );

            if (replacement) {
                selected.push(replacement);
            }
        }

        for (const product of products) {
            if (selected.length >= 4) break;

            if (
                product.stock > 0 &&
                !selected.some(
                    (item) => item.id === product.id
                )
            ) {
                selected.push(product);
            }
        }

        return selected;
    }, [featured, products]);

    function goToPage(page: number) {
        if (page < 1 || page > totalPages) return;

        setCurrentPage(page);
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function changeProductsPerPage(value: number) {
        setProductsPerPage(value);
        setCurrentPage(1);
    }

    const list = featured ? featuredProducts : products;

    if (featured && loading) {
        return (
            <div className="product-grid stagger-children">
                {Array.from({
                    length: featured ? 4 : productsPerPage,
                }).map((_, index) => (
                    <div
                        key={index}
                        className="product-card"
                        style={{
                            minHeight: "320px",
                            background:
                                "var(--color-bg-subtle)",
                            animation:
                                "pulse 1.5s ease-in-out infinite",
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <>
            {!featured && (
                <>
                    <div className="filters-bar">
                        <input
                            type="search"
                            className="search-box"
                            placeholder="    Search products..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />

                        <Dropdown
                            value={category}
                            onChange={(val) => setCategory(val)}
                            options={[
                                { label: "All Categories", value: "all" },
                                ...categories.map((cat) => ({ label: cat, value: cat })),
                            ]}
                        />

                        <Dropdown
                            value={sort}
                            onChange={(val) => setSort(val)}
                            options={[
                                { label: "Sort By", value: "default" },
                                { label: "Price: Low to High", value: "price-low" },
                                { label: "Price: High to Low", value: "price-high" },
                                { label: "Name: A to Z", value: "name-az" },
                                { label: "Name: Z to A", value: "name-za" },
                                { label: "Discount: High to Low", value: "discount" },
                            ]}
                        />
                    </div>

                    <ProductCountSelector
                        value={productsPerPage}
                        onChange={changeProductsPerPage}
                        options={PRODUCTS_PER_PAGE_OPTIONS}
                    />
                </>
            )}

            {loading ? (
                <div className="product-grid">
                    {Array.from({ length: featured ? 4 : productsPerPage }).map((_, index) => (
                        <ProductCardSkeleton key={index} />
                    ))}
                </div>
            ) : list.length > 0 ? (
                featured ? (
                    <div className="product-grid stagger-children">
                        {list.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                            />
                        ))}
                    </div>
                ) : (
                    <ProductEntranceAnimation
                        enabled={!featured}
                        triggerKey={`${category}-${currentPage}-${sort}-${debouncedSearch}`}
                        totalCount={list.length}
                    >
                        {({ isEntranceActive }) => (
                            <div
                                className={`product-grid ${
                                    isEntranceActive
                                        ? "cinematic-grid-active"
                                        : "cinematic-grid-settled"
                                }`}
                            >
                                {list.map((product, index) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        entranceIndex={index}
                                        isEntranceActive={isEntranceActive}
                                    />
                                ))}
                            </div>
                        )}
                    </ProductEntranceAnimation>
                )
            ) : (
                <EmptyState
                    icon="🔍"
                    title="No products found"
                    description="Try changing your search or filter."
                />
            )}

            {!featured &&
                totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                        maxVisiblePages={10}
                        variant="circles"
                        info={`Page ${currentPage} of ${totalPages} • ${totalProducts} products`}
                    />
                )}
        </>
    );
}