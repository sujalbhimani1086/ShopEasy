import { prisma } from "@/lib/prisma";
import { requireApprovedCustomer } from "@/lib/api-auth";
import { jsPDF } from "jspdf";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: Request,
    context: RouteContext
) {
    const auth = await requireApprovedCustomer(request);
    if (auth.response) return auth.response;
    const user = auth.user;

    try {
        const { id } = await context.params;
        const orderId = Number.parseInt(id, 10);

        if (Number.isNaN(orderId) || orderId <= 0) {
            return Response.json(
                { message: "Invalid order ID." },
                { status: 400 }
            );
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!order) {
            return Response.json(
                { message: "Order not found." },
                { status: 404 }
            );
        }

        // SECURITY CHECK: Customer can only access their own orders (by userId or email). Admin can access any order.
        const userEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
        const isOwner =
            order.userId === Number(user.id) ||
            (userEmail !== "" && order.email?.trim().toLowerCase() === userEmail);

        if (!isOwner && user.role !== "ADMIN") {
            return Response.json(
                { message: "You are not authorized to view this invoice." },
                { status: 403 }
            );
        }

        const validOrder = order;
        const invoiceDateStr = new Date(validOrder.createdAt).toLocaleDateString();
        const invoiceNumberStr = `INV-${validOrder.id}`;

        // ==========================================
        // GENERATE PDF USING JSPDF (SAFE & RESPONSIVE)
        // ==========================================
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 16;
        const contentWidth = pageWidth - margin * 2;
        const bottomLimit = pageHeight - 22; // Reserve 22mm for footer
        let y = 0;

        // ------------------------------------------
        // HELPER: DRAW PAGE HEADER (FIRST PAGE)
        // ------------------------------------------
        function drawFirstPageHeader(): number {
            doc.setFillColor(30, 41, 59); // Slate-800
            doc.rect(0, 0, pageWidth, 32, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.setTextColor(255, 255, 255);
            doc.text("ShopEasy", margin, 15);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(203, 213, 225); // Slate-300
            doc.text("E-COMMERCE INVOICE & RECEIPT", margin, 22);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.text("TAX INVOICE", pageWidth - margin, 15, { align: "right" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(203, 213, 225);
            doc.text(`Invoice Date: ${invoiceDateStr}`, pageWidth - margin, 22, {
                align: "right",
            });

            return 40;
        }

        // ------------------------------------------
        // HELPER: DRAW COMPACT HEADER (SUBSEQUENT PAGES)
        // ------------------------------------------
        function drawSubsequentPageHeader(): number {
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, pageWidth, 16, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.text(`ShopEasy — Invoice #${invoiceNumberStr}`, margin, 10.5);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(203, 213, 225);
            doc.text("Continued", pageWidth - margin, 10.5, { align: "right" });

            return 24;
        }

        // ------------------------------------------
        // HELPER: DRAW TABLE HEADER
        // ------------------------------------------
        const descColWidth = 84;
        const qtyColX = margin + descColWidth + 14; // ~114
        const unitPriceColX = qtyColX + 38; // ~152
        const amountColX = pageWidth - margin - 3; // ~191

        function drawTableHeader(curY: number): number {
            doc.setFillColor(241, 245, 249); // Slate-100
            doc.rect(margin, curY, contentWidth, 7, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105); // Slate-600

            doc.text("ITEM DESCRIPTION", margin + 3, curY + 4.8);
            doc.text("QTY", qtyColX, curY + 4.8, { align: "center" });
            doc.text("UNIT PRICE", unitPriceColX, curY + 4.8, { align: "right" });
            doc.text("AMOUNT", amountColX, curY + 4.8, { align: "right" });

            return curY + 9;
        }

        // 1. Draw First Page Header
        y = drawFirstPageHeader();

        // 2. Order Summary & Billed To in Two Dynamic Columns
        const billedToWidth = 96;
        const orderMetaX = margin + billedToWidth + 8; // ~120
        const orderMetaWidth = pageWidth - margin - orderMetaX; // ~58

        const startInfoY = y;
        let leftY = startInfoY;
        let rightY = startInfoY;

        // --- Left Column: BILLED TO ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text("BILLED TO", margin, leftY);
        leftY += 5;

        const customerName = (order.name || order.user?.name || "Valued Customer").trim();
        const customerEmail = (order.email || order.user?.email || "").trim();
        const addressParts = [order.address, order.city, order.pincode].filter(Boolean);
        const addressText = addressParts.join(", ").trim();

        // Safe Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        const nameLines: string[] = doc.splitTextToSize(customerName, billedToWidth);
        for (const line of nameLines) {
            doc.text(line, margin, leftY);
            leftY += 4.2;
        }

        // Safe Email
        if (customerEmail) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            const emailLines: string[] = doc.splitTextToSize(customerEmail, billedToWidth);
            for (const line of emailLines) {
                doc.text(line, margin, leftY);
                leftY += 4;
            }
        }

        // Safe Multi-Line Address
        if (addressText) {
            leftY += 1.5;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Delivery Address:", margin, leftY);
            leftY += 4;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            const addressLines: string[] = doc.splitTextToSize(addressText, billedToWidth);
            for (const line of addressLines) {
                doc.text(line, margin, leftY);
                leftY += 3.8;
            }
        }

        // --- Right Column: ORDER DETAILS ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("ORDER DETAILS", orderMetaX, rightY);
        rightY += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);

        doc.text(`Order ID: #${order.id}`, orderMetaX, rightY);
        rightY += 4.2;

        doc.text(`Status: ${order.status}`, orderMetaX, rightY);
        rightY += 4.2;

        const placedOnStr = `Placed On: ${new Date(order.createdAt).toLocaleString()}`;
        const placedLines: string[] = doc.splitTextToSize(placedOnStr, orderMetaWidth);
        for (const line of placedLines) {
            doc.text(line, orderMetaX, rightY);
            rightY += 4;
        }

        // Advance Y safely based on whichever column was taller
        y = Math.max(leftY, rightY) + 4;

        // Divider Line
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        // 3. Draw Items Table Header
        y = drawTableHeader(y);

        // 4. Draw Line Items With Dynamic Wrapping and Page Breaks
        for (const item of order.items) {
            const itemTitle = (item.productName || (item.productId ? `Product #${item.productId}` : "Product Item")).trim();
            const itemQty = item.quantity;
            const itemPrice = item.price;
            const itemSubtotal = itemPrice * itemQty;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);

            const titleLines: string[] = doc.splitTextToSize(itemTitle, descColWidth);
            const lineHeight = 4;
            const rowHeight = Math.max(8, titleLines.length * lineHeight + 3.5);

            // Check if row exceeds page
            if (y + rowHeight > bottomLimit) {
                doc.addPage();
                y = drawSubsequentPageHeader();
                y = drawTableHeader(y);
            }

            // Draw wrapped product description lines
            for (let i = 0; i < titleLines.length; i++) {
                doc.text(titleLines[i], margin + 3, y + 4 + i * lineHeight);
            }

            // Draw Qty, Unit Price, Amount (aligned with the first title line)
            const baseTextY = y + 4;
            doc.text(String(itemQty), qtyColX, baseTextY, { align: "center" });
            doc.text(`Rs. ${itemPrice.toLocaleString("en-IN")}`, unitPriceColX, baseTextY, { align: "right" });
            doc.text(`Rs. ${itemSubtotal.toLocaleString("en-IN")}`, amountColX, baseTextY, { align: "right" });

            // Bottom row border
            y += rowHeight;
            doc.setDrawColor(241, 245, 249);
            doc.line(margin, y, pageWidth - margin, y);
        }

        y += 5;

        // 5. Pricing & Totals Summary
        const totalsBlockHeight = (order.discount || 0) > 0 ? 32 : 24;
        if (y + totalsBlockHeight > bottomLimit) {
            doc.addPage();
            y = drawSubsequentPageHeader() + 5;
        }

        const calculatedSubtotal = order.subtotal ?? (order.total + (order.discount || 0));
        const discountAmount = order.discount || 0;

        const totalsBoxWidth = 84;
        const totalsBoxX = pageWidth - margin - totalsBoxWidth;
        const labelX = totalsBoxX + 42;
        const valX = amountColX;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);

        doc.text("Subtotal:", labelX, y, { align: "right" });
        doc.text(`Rs. ${calculatedSubtotal.toLocaleString("en-IN")}`, valX, y, { align: "right" });

        if (discountAmount > 0) {
            y += 5.5;
            const couponLabel = order.couponCode ? `Coupon (${order.couponCode}):` : "Discount:";
            doc.setTextColor(22, 163, 74); // Green
            doc.text(couponLabel, labelX, y, { align: "right" });
            doc.text(`-Rs. ${discountAmount.toLocaleString("en-IN")}`, valX, y, { align: "right" });
        }

        y += 4;
        doc.setDrawColor(15, 23, 42);
        doc.line(totalsBoxX, y, pageWidth - margin, y);
        y += 5.5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("Final Total:", labelX, y, { align: "right" });
        doc.text(`Rs. ${order.total.toLocaleString("en-IN")}`, valX, y, { align: "right" });

        // 6. Footer & Page Numbers across ALL pages
        const totalPages = doc.getNumberOfPages();
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            doc.setPage(pageNum);

            doc.setDrawColor(226, 232, 240);
            doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.8);
            doc.setTextColor(148, 163, 184); // Slate-400
            doc.text(
                "Thank you for shopping with ShopEasy! For any support, please visit our website.",
                margin,
                pageHeight - 10
            );

            doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, {
                align: "right",
            });
        }

        const pdfBuffer = doc.output("arraybuffer");

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="ShopEasy-Invoice-ORD-${order.id}.pdf"`,
                "Cache-Control": "private, no-cache, no-store, must-revalidate",
            },
        });
    } catch (error) {
        console.error("GENERATE INVOICE ERROR:", error);
        return Response.json(
            { message: "Could not generate invoice." },
            { status: 500 }
        );
    }
}
