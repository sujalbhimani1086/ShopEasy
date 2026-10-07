import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

/**
 * GET /api/admin/categories
 * Returns all categories with product count for admin dashboard.
 */
export async function GET(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                name: "asc",
            },
        });

        // Count products for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (cat) => {
                const productCount = await prisma.product.count({
                    where: {
                        category: cat.name,
                    },
                });

                return {
                    id: cat.id,
                    name: cat.name,
                    createdAt: cat.createdAt.toISOString(),
                    updatedAt: cat.updatedAt.toISOString(),
                    productCount,
                };
            })
        );

        return Response.json(categoriesWithCount);
    } catch (error) {
        console.error("ADMIN GET CATEGORIES ERROR:", error);
        return Response.json(
            { message: "Failed to load categories." },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/categories
 * Creates a new category.
 */
export async function POST(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const rawName = typeof body?.name === "string" ? body.name : "";
        const name = rawName.trim();

        if (!name) {
            return Response.json(
                { message: "Category name is required." },
                { status: 400 }
            );
        }

        if (name.length > 50) {
            return Response.json(
                { message: "Category name must be under 50 characters." },
                { status: 400 }
            );
        }

        // Check for existing category with same name
        const existing = await prisma.category.findFirst({
            where: {
                name: {
                    equals: name,
                },
            },
        });

        if (existing) {
            return Response.json(
                { message: "Category already exists." },
                { status: 409 }
            );
        }

        const category = await prisma.category.create({
            data: {
                name,
            },
        });

        return Response.json(
            {
                success: true,
                message: "Category created successfully",
                category: {
                    id: category.id,
                    name: category.name,
                    createdAt: category.createdAt.toISOString(),
                    updatedAt: category.updatedAt.toISOString(),
                    productCount: 0,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("ADMIN CREATE CATEGORY ERROR:", error);
        return Response.json(
            { message: "Failed to create category." },
            { status: 500 }
        );
    }
}
