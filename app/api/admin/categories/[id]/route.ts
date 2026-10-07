import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

/**
 * PATCH /api/admin/categories/[id]
 * Updates category name and synchronizes any products using the old name.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    try {
        const { id: rawId } = await params;
        const categoryId = Number.parseInt(rawId, 10);

        if (!Number.isFinite(categoryId) || categoryId <= 0) {
            return Response.json(
                { message: "Invalid category ID." },
                { status: 400 }
            );
        }

        const existingCategory = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!existingCategory) {
            return Response.json(
                { message: "Category not found." },
                { status: 404 }
            );
        }

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

        // If the name is changed, verify uniqueness
        if (name.toLowerCase() !== existingCategory.name.toLowerCase()) {
            const duplicate = await prisma.category.findFirst({
                where: {
                    name: {
                        equals: name,
                    },
                    NOT: {
                        id: categoryId,
                    },
                },
            });

            if (duplicate) {
                return Response.json(
                    { message: "Category already exists." },
                    { status: 409 }
                );
            }
        }

        const oldName = existingCategory.name;

        // Update category and synchronize products in a transaction
        const [updatedCategory] = await prisma.$transaction([
            prisma.category.update({
                where: { id: categoryId },
                data: { name },
            }),
            prisma.product.updateMany({
                where: { category: oldName },
                data: { category: name },
            }),
        ]);

        const productCount = await prisma.product.count({
            where: { category: updatedCategory.name },
        });

        return Response.json({
            success: true,
            message: "Category updated successfully",
            category: {
                id: updatedCategory.id,
                name: updatedCategory.name,
                createdAt: updatedCategory.createdAt.toISOString(),
                updatedAt: updatedCategory.updatedAt.toISOString(),
                productCount,
            },
        });
    } catch (error) {
        console.error("ADMIN UPDATE CATEGORY ERROR:", error);
        return Response.json(
            { message: "Failed to update category." },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/categories/[id]
 * Safely deletes an unused category. Blocks deletion if any products use it.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    try {
        const { id: rawId } = await params;
        const categoryId = Number.parseInt(rawId, 10);

        if (!Number.isFinite(categoryId) || categoryId <= 0) {
            return Response.json(
                { message: "Invalid category ID." },
                { status: 400 }
            );
        }

        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            return Response.json(
                { message: "Category not found." },
                { status: 404 }
            );
        }

        // ==========================================
        // CATEGORY DELETE SAFETY CHECK
        // ==========================================
        const productCount = await prisma.product.count({
            where: { category: category.name },
        });

        if (productCount > 0) {
            return Response.json(
                {
                    message: "Cannot delete this category because products are using it.",
                    productCount,
                },
                { status: 400 }
            );
        }

        await prisma.category.delete({
            where: { id: categoryId },
        });

        return Response.json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        console.error("ADMIN DELETE CATEGORY ERROR:", error);
        return Response.json(
            { message: "Failed to delete category." },
            { status: 500 }
        );
    }
}
