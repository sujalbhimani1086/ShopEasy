import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(
    request: Request,
    context: RouteContext
) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    try {
        const { id } = await context.params;
        const couponId = Number.parseInt(id, 10);

        if (Number.isNaN(couponId) || couponId <= 0) {
            return Response.json(
                { message: "Invalid coupon ID." },
                { status: 400 }
            );
        }

        const coupon = await prisma.coupon.findUnique({
            where: { id: couponId },
        });

        if (!coupon) {
            return Response.json(
                { message: "Coupon not found." },
                { status: 404 }
            );
        }

        const body = await request.json();
        const updateData: Record<string, unknown> = {};

        if (typeof body.isActive === "boolean") {
            updateData.isActive = body.isActive;
        }

        if (body.discountValue !== undefined) {
            const val = Number.parseInt(body.discountValue, 10);
            if (!Number.isNaN(val) && val > 0) {
                updateData.discountValue = val;
            }
        }

        if (body.minOrderAmount !== undefined) {
            const val = Number.parseInt(body.minOrderAmount, 10);
            if (!Number.isNaN(val) && val >= 0) {
                updateData.minOrderAmount = val;
            }
        }

        if (body.maxDiscount !== undefined) {
            updateData.maxDiscount = body.maxDiscount ? Number.parseInt(body.maxDiscount, 10) : null;
        }

        if (body.usageLimit !== undefined) {
            updateData.usageLimit = body.usageLimit ? Number.parseInt(body.usageLimit, 10) : null;
        }

        if (body.expiresAt !== undefined) {
            updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
        }

        const updated = await prisma.coupon.update({
            where: { id: couponId },
            data: updateData,
        });

        return Response.json({
            success: true,
            message: "Coupon updated successfully.",
            coupon: updated,
        });
    } catch (error) {
        console.error("ADMIN UPDATE COUPON ERROR:", error);
        return Response.json(
            { message: "Could not update coupon." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    context: RouteContext
) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    try {
        const { id } = await context.params;
        const couponId = Number.parseInt(id, 10);

        if (Number.isNaN(couponId) || couponId <= 0) {
            return Response.json(
                { message: "Invalid coupon ID." },
                { status: 400 }
            );
        }

        const coupon = await prisma.coupon.findUnique({
            where: { id: couponId },
        });

        if (!coupon) {
            return Response.json(
                { message: "Coupon not found." },
                { status: 404 }
            );
        }

        await prisma.coupon.delete({
            where: { id: couponId },
        });

        return Response.json({
            success: true,
            message: "Coupon deleted successfully.",
        });
    } catch (error) {
        console.error("ADMIN DELETE COUPON ERROR:", error);
        return Response.json(
            { message: "Could not delete coupon." },
            { status: 500 }
        );
    }
}
