import { getProductById } from "@/lib/products";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const numericId = Number.parseInt(id, 10);

        if (!Number.isFinite(numericId) || numericId <= 0) {
            return Response.json(
                { message: "Invalid product ID" },
                { status: 400 }
            );
        }

        const product = await getProductById(numericId);

        if (!product) {
            return Response.json(
                { message: "Product not found" },
                { status: 404 }
            );
        }

        return Response.json(product);
    } catch (error) {
        console.error("GET PRODUCT BY ID ERROR:", error);

        return Response.json(
            { message: "Failed to fetch product" },
            { status: 500 }
        );
    }
}
