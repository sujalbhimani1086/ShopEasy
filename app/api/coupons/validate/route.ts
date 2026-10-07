import { prisma } from "@/lib/prisma";
import { requireApprovedCustomer } from "@/lib/api-auth";

export async function POST(request: Request) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;

    try {
        const body = await request.json();
        const code = (body.code || "").trim().toUpperCase();
        const subtotal = Number(body.subtotal);

        if (!code) {
            return Response.json(
                { message: "Please enter a coupon code." },
                { status: 400 }
            );
        }

        if (Number.isNaN(subtotal) || subtotal <= 0) {
            return Response.json(
                { message: "Invalid order subtotal." },
                { status: 400 }
            );
        }

        const coupon = await prisma.coupon.findUnique({
            where: { code },
        });

        if (!coupon) {
            return Response.json(
                { message: "Invalid promo code. Please check and try again." },
                { status: 404 }
            );
        }

        if (!coupon.isActive) {
            return Response.json(
                { message: "This coupon is currently inactive." },
                { status: 400 }
            );
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return Response.json(
                { message: "This coupon has expired." },
                { status: 400 }
            );
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return Response.json(
                { message: "This coupon has reached its maximum usage limit." },
                { status: 400 }
            );
        }

        if (subtotal < coupon.minOrderAmount) {
            return Response.json(
                {
                    message: `Minimum order amount of ₹${coupon.minOrderAmount} is required for this coupon.`,
                },
                { status: 400 }
            );
        }

        let discountAmount = 0;
        if (coupon.discountType === "PERCENTAGE") {
            discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
            if (coupon.maxDiscount && coupon.maxDiscount > 0) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscount);
            }
        } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
        }

        const finalTotal = Math.max(0, subtotal - discountAmount);

        return Response.json({
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount,
                subtotal,
                finalTotal,
            },
            message: `Coupon "${coupon.code}" applied! You saved ₹${discountAmount}.`,
        });
    } catch (error) {
        console.error("VALIDATE COUPON ERROR:", error);
        return Response.json(
            { message: "Could not validate coupon." },
            { status: 500 }
        );
    }
}
