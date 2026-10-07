import { prisma } from "@/lib/prisma";
import type { Product } from "@/lib/types";

export type GetProductsParams = {
    page?: number | string;
    limit?: number | string;
    search?: string;
    category?: string;
    sort?: string;
};

export type ProductsResponse = {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    categories: string[];
};

export async function getProductsData(
    params: GetProductsParams = {}
): Promise<ProductsResponse> {
    const page = Math.max(
        1,
        Number.parseInt(String(params.page || "1"), 10) || 1
    );

    const requestedLimit = Number.parseInt(
        String(params.limit || "12"),
        10
    );

    const limit = Math.min(
        50,
        Math.max(
            1,
            Number.isFinite(requestedLimit) ? requestedLimit : 12
        )
    );

    const search = (params.search || "").trim();
    const category = params.category || "all";
    const sort = params.sort || "default";

    const where = {
        ...(search
            ? {
                  name: {
                      contains: search,
                  },
              }
            : {}),
        ...(category !== "all"
            ? {
                  category,
              }
            : {}),
    };

    const orderBy = {
        "price-low": { price: "asc" as const },
        "price-high": { price: "desc" as const },
        "name-az": { name: "asc" as const },
        "name-za": { name: "desc" as const },
        discount: { discount: "desc" as const },
        default: { id: "asc" as const },
    }[sort] || { id: "asc" as const };

    const [products, total, categoryRows] = await Promise.all([
        prisma.product.findMany({
            where,
            select: {
                id: true,
                name: true,
                price: true,
                discount: true,
                category: true,
                image: true,
                stock: true,
            },
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
        }),

        prisma.product.count({ where }),

        prisma.category.findMany({
            select: {
                name: true,
            },
            orderBy: {
                name: "asc",
            },
        }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        products,
        total,
        page,
        limit,
        totalPages,
        categories: categoryRows.map((item) => item.name),
    };
}

export async function getProductById(
    id: number | string
): Promise<Product | null> {
    const numericId =
        typeof id === "number" ? id : Number.parseInt(String(id), 10);

    if (!Number.isFinite(numericId) || numericId <= 0) {
        return null;
    }

    return prisma.product.findUnique({
        where: { id: numericId },
        select: {
            id: true,
            name: true,
            price: true,
            discount: true,
            category: true,
            image: true,
            stock: true,
        },
    });
}

export async function getCategoryBannerProducts(): Promise<Product[]> {
    const categoryRows = await prisma.product.findMany({
        select: {
            category: true,
        },
        distinct: ["category"],
        orderBy: {
            category: "asc",
        },
    });

    const categories = categoryRows
        .map((row) => row.category?.trim())
        .filter(Boolean) as string[];

    if (categories.length === 0) {
        return [];
    }

    const inStockProducts = await prisma.product.findMany({
        where: {
            stock: {
                gt: 0,
            },
        },
        select: {
            id: true,
            name: true,
            price: true,
            discount: true,
            category: true,
            image: true,
            stock: true,
        },
        orderBy: [
            { discount: "desc" },
            { id: "desc" },
        ],
    });

    const bannerProducts: Product[] = [];
    const usedProductIds = new Set<number>();

    for (const category of categories) {
        let chosen = inStockProducts.find(
            (p) => p.category === category && !usedProductIds.has(p.id)
        );

        if (!chosen) {
            chosen = inStockProducts.find((p) => p.category === category);
        }

        if (chosen) {
            bannerProducts.push(chosen);
            usedProductIds.add(chosen.id);
        }
    }

    return bannerProducts;
}
