import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
    const token = (request.headers.get("cookie") ?? "")
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("token="))
        ?.slice("token=".length);
    const user = token ? await verifyToken(token) : null;
    if (user?.role !== "ADMIN") {
        return Response.json({ message: "Admin access required" }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        return Response.json({ success: true, users });
    } catch (error) {
        console.error("TEST DB ERROR:", error);
        return Response.json({ message: "Database query failed" }, { status: 500 });
    }
}
