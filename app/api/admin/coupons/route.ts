import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: Request) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    try {
        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim();
        const statusFilter = searchParams.get("status");

        const where: Record<string, unknown> = {};

        if (statusFilter === "ACTIVE") {
            where.isActive = true;
        } else if (statusFilter === "INACTIVE") {
            where.isActive = false;
        }

        if (search) {
            where.code = { contains: search };
        }

        const coupons = await prisma.coupon.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        const formatted = coupons.map((c) => ({
            id: c.id,
            code: c.code,
            discountType: c.discountType,
            discountValue: c.discountValue,
            minOrderAmount: c.minOrderAmount,
            maxDiscount: c.maxDiscount,
            usageLimit: c.usageLimit,
            usedCount: c.usedCount,
            expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
            isActive: c.isActive,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        }));

        return Response.json(formatted);
    } catch (error) {
        console.error("ADMIN GET COUPONS ERROR:", error);
        return Response.json(
            { message: "Could not fetch coupons." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const adminCheck = await requireAdmin(request);
    if (adminCheck) return adminCheck;

    try {
        const body = await request.json();
        const code = (body.code || "").trim().toUpperCase();
        const discountType = body.discountType === "FIXED" ? "FIXED" : "PERCENTAGE";
        const discountValue = Number.parseInt(body.discountValue, 10);
        const minOrderAmount = Number.parseInt(body.minOrderAmount || "0", 10) || 0;
        const maxDiscount = body.maxDiscount ? Number.parseInt(body.maxDiscount, 10) : null;
        const usageLimit = body.usageLimit ? Number.parseInt(body.usageLimit, 10) : null;
        const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
        const isActive = body.isActive !== false;

        if (!code || code.length < 3) {
            return Response.json(
                { message: "Coupon code must be at least 3 characters long." },
                { status: 400 }
            );
        }

        if (Number.isNaN(discountValue) || discountValue <= 0) {
            return Response.json(
                { message: "Discount value must be greater than 0." },
                { status: 400 }
            );
        }

        if (discountType === "PERCENTAGE" && discountValue > 100) {
            return Response.json(
                { message: "Percentage discount cannot exceed 100%." },
                { status: 400 }
            );
        }

        // Check if code already exists
        const existing = await prisma.coupon.findUnique({
            where: { code },
        });

        if (existing) {
            return Response.json(
                { message: `Coupon with code "${code}" already exists.` },
                { status: 409 }
            );
        }

        const coupon = await prisma.coupon.create({
            data: {
                code,
                discountType,
                discountValue,
                minOrderAmount,
                maxDiscount,
                usageLimit,
                expiresAt,
                isActive,
            },
        });

        return Response.json(
            {
                success: true,
                message: `Coupon "${code}" created successfully.`,
                coupon,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("ADMIN CREATE COUPON ERROR:", error);
        return Response.json(
            { message: "Could not create coupon." },
            { status: 500 }
        );
    }
}
