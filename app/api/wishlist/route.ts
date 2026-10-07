import { prisma } from "@/lib/prisma";
import { requireApprovedCustomer } from "@/lib/api-auth";

export async function GET(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const wishlist = await prisma.wishlist.findMany({
            where: {
                userId: Number(user.id),
            },
            include: {
                product: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return Response.json(wishlist);
    } catch (error) {
        console.error("GET WISHLIST ERROR:", error);

        return Response.json(
            { message: "Failed to load wishlist" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const body = await request.json();
        const productId = Number(body.productId);

        if (!Number.isInteger(productId) || productId <= 0) {
            return Response.json(
                { message: "Invalid product ID" },
                { status: 400 }
            );
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            return Response.json(
                { message: "Product not found" },
                { status: 404 }
            );
        }

        const existing = await prisma.wishlist.findUnique({
            where: {
                userId_productId: {
                    userId: Number(user.id),
                    productId,
                },
            },
        });

        if (existing) {
            await prisma.wishlist.delete({
                where: {
                    id: existing.id,
                },
            });

            return Response.json({
                success: true,
                wishlisted: false,
                message: "Removed from wishlist",
            });
        }

        await prisma.wishlist.create({
            data: {
                userId: Number(user.id),
                productId,
            },
        });

        return Response.json({
            success: true,
            wishlisted: true,
            message: "Added to wishlist",
        });
    } catch (error) {
        console.error("WISHLIST ERROR:", error);

        return Response.json(
            { message: "Wishlist operation failed" },
            { status: 500 }
        );
    }
}