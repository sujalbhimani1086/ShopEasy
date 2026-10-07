import { getCategoryBannerProducts, getProductsData } from "@/lib/products";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        if (searchParams.get("banner") === "true") {
            const bannerProducts = await getCategoryBannerProducts();
            return Response.json(bannerProducts);
        }

        const data = await getProductsData({
            page: searchParams.get("page") || "1",
            limit: searchParams.get("limit") || "12",
            search: searchParams.get("search") || "",
            category: searchParams.get("category") || "all",
            sort: searchParams.get("sort") || "default",
        });

        return Response.json(data);
    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);

        return Response.json(
            {
                message: "Failed to load products",
            },
            {
                status: 500,
            }
        );
    }
}