import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return Response.json(categories);
    } catch (error) {
        console.error("GET CATEGORIES ERROR:", error);
        return Response.json(
            { message: "Failed to load categories." },
            { status: 500 }
        );
    }
}
