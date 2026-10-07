import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
        return Response.json({ message: "Use application/json" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return Response.json({ message: "JSON body must be an object" }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";

    if (!name) {
        return Response.json({ message: "Please enter your name." }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json({ message: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || password.length < 6) {
        return Response.json({ message: "Password must be at least 6 characters." }, { status: 400 });
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, status: true },
        });

        if (existingUser) {
            if (existingUser.status === "PENDING") {
                return Response.json(
                    {
                        message: "Your registration is already waiting for admin approval.",
                        status: "PENDING",
                    },
                    { status: 409 }
                );
            }

            if (existingUser.status === "DECLINED") {
                return Response.json(
                    {
                        message: "Your previous registration was declined. Please contact the administrator.",
                        status: "DECLINED",
                    },
                    { status: 409 }
                );
            }

            return Response.json(
                {
                    message: "An account with this email already exists. Please login.",
                    status: "APPROVED",
                },
                { status: 409 }
            );
        }

        // Public registration ALWAYS creates role: "CUSTOMER" and status: "PENDING".
        // Any user-supplied role is strictly ignored.
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: await hashPassword(password),
                role: "CUSTOMER",
                status: "PENDING",
            },
        });

        return Response.json({
            success: true,
            message: "Your registration request has been submitted for admin approval.",
            status: "PENDING",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return Response.json({ message: "Email already registered." }, { status: 409 });
        }
        console.error("REGISTRATION ERROR:", error);

        return Response.json(
            { message: "Registration failed. Please try again." },
            { status: 500 }
        );
    }
}
