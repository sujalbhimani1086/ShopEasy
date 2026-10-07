import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

type ProductFields = {
    name: string;
    price: number;
    discount: number;
    category: string;
    stock: number;
};

const imageExtensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
};


function validateFields(input: Record<string, unknown>) {
    const name =
        typeof input.name === "string"
            ? input.name.trim()
            : "";

    const category =
        typeof input.category === "string"
            ? input.category.trim()
            : "";

    const price =
        typeof input.price === "number"
            ? input.price
            : Number(input.price);

    const discount =
        input.discount === undefined || input.discount === ""
            ? 0
            : typeof input.discount === "number"
                ? input.discount
                : Number(input.discount);

    const stock =
        input.stock === undefined || input.stock === ""
            ? 0
            : typeof input.stock === "number"
                ? input.stock
                : Number(input.stock);

    if (
        !name ||
        !category ||
        !Number.isInteger(price) ||
        price <= 0 ||
        !Number.isInteger(discount) ||
        discount < 0 ||
        discount > 100 ||
        !Number.isInteger(stock) ||
        stock < 0
    ) {
        return {
            error:
                "Enter a valid product name, category, price, discount, and stock.",
        };
    }

    return {
        data: {
            name,
            category,
            price,
            discount,
            stock,
        } satisfies ProductFields,
    };
}

function fieldsFromForm(formData: FormData) {
    return validateFields({
        name: formData.get("name"),
        category: formData.get("category"),
        price: formData.get("price"),
        discount: formData.get("discount"),
        stock: formData.get("stock"),
    });
}

async function saveImage(image: File) {
    const extension = imageExtensions[image.type];

    if (!extension || image.size === 0) {
        throw new Error(
            "Upload a valid JPEG, PNG, WebP, GIF, or AVIF image."
        );
    }

    const fileName = `${randomUUID()}${extension}`;

    const directory = path.join(
        process.cwd(),
        "public",
        "images"
    );

    await mkdir(directory, {
        recursive: true,
    });

    await writeFile(
        path.join(directory, fileName),
        Buffer.from(await image.arrayBuffer())
    );

    return `/images/${fileName}`;
}

async function saveImageFromUrl(imageUrl: string) {
    const url = imageUrl.trim();

    if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
    ) {
        throw new Error(
            "Image URL must start with http:// or https://."
        );
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            "Could not download image from the provided URL."
        );
    }

    const contentType = response.headers
        .get("content-type")
        ?.split(";")[0]
        .toLowerCase();

    const extension =
        imageExtensions[contentType || ""];

    if (!extension) {
        throw new Error(
            "Online URL must point to a JPEG, PNG, WebP, GIF, or AVIF image."
        );
    }

    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
        throw new Error("The online image is empty.");
    }

    const fileName = `${randomUUID()}${extension}`;

    const directory = path.join(
        process.cwd(),
        "public",
        "images"
    );

    await mkdir(directory, {
        recursive: true,
    });

    await writeFile(
        path.join(directory, fileName),
        Buffer.from(arrayBuffer)
    );

    return `/images/${fileName}`;
}

function isPrismaCode(error: unknown, code: string) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === code
    );
}

/* GET - View all products */
export async function GET(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    try {
        const products = await prisma.product.findMany({
            orderBy: {
                id: "asc",
            },
        });

        return Response.json(products);
    } catch (error) {
        console.error(
            "ADMIN GET PRODUCTS ERROR:",
            error
        );

        return Response.json(
            { message: "Failed to load products" },
            { status: 500 }
        );
    }
}

/* POST - Add product */
export async function POST(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const contentType =
        request.headers
            .get("content-type")
            ?.toLowerCase() ?? "";

    if (!contentType.includes("multipart/form-data")) {
        return Response.json(
            {
                message:
                    "Use multipart/form-data to add a product.",
            },
            { status: 400 }
        );
    }

    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return Response.json(
            { message: "Invalid multipart form data" },
            { status: 400 }
        );
    }

    const fields = fieldsFromForm(formData);

    if ("error" in fields) {
        return Response.json(
            { message: fields.error },
            { status: 400 }
        );
    }

    const categoryRecord = await prisma.category.findFirst({
        where: {
            name: {
                equals: fields.data.category,
            },
        },
    });

    if (!categoryRecord) {
        return Response.json(
            {
                message: `Category "${fields.data.category}" does not exist. Please select or create a valid category.`,
            },
            { status: 400 }
        );
    }

    const image = formData.get("image");

    const imageUrl = String(
        formData.get("imageUrl") ?? ""
    ).trim();

    if (
        !(image instanceof File) &&
        !imageUrl
    ) {
        return Response.json(
            {
                message:
                    "Select an image file or enter an image URL.",
            },
            { status: 400 }
        );
    }

    try {
        let imagePath: string;

        if (
            image instanceof File &&
            image.size > 0
        ) {
            imagePath = await saveImage(image);
        } else {
            imagePath = await saveImageFromUrl(
                imageUrl
            );
        }

        const product = await prisma.product.create({
            data: {
                ...fields.data,
                image: imagePath,
            },
        });

        return Response.json(
            {
                success: true,
                product,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error(
            "ADMIN CREATE PRODUCT ERROR:",
            error
        );

        return Response.json(
            {
                message:
                    error instanceof Error
                        ? error.message
                        : "Product could not be added",
            },
            { status: 500 }
        );
    }
}

/* PUT - Edit product */
export async function PUT(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const contentType =
        request.headers
            .get("content-type")
            ?.toLowerCase() ?? "";

    let input: Record<string, unknown>;
    let image: File | null = null;
    let imageUrl = "";

    try {
        if (
            contentType.includes("application/json")
        ) {
            const body: unknown =
                await request.json();

            if (
                typeof body !== "object" ||
                body === null ||
                Array.isArray(body)
            ) {
                return Response.json(
                    {
                        message:
                            "JSON body must be an object",
                    },
                    { status: 400 }
                );
            }

            input =
                body as Record<string, unknown>;

            imageUrl =
                typeof input.imageUrl === "string"
                    ? input.imageUrl.trim()
                    : "";
        } else if (
            contentType.includes(
                "multipart/form-data"
            )
        ) {
            const formData =
                await request.formData();

            input = {
                id: formData.get("id"),
                name: formData.get("name"),
                price: formData.get("price"),
                discount: formData.get("discount"),
                category: formData.get("category"),
                stock: formData.get("stock"),
            };

            const uploadedImage =
                formData.get("image");

            if (
                uploadedImage instanceof File &&
                uploadedImage.size > 0
            ) {
                image = uploadedImage;
            }

            imageUrl = String(
                formData.get("imageUrl") ?? ""
            ).trim();
        } else {
            return Response.json(
                {
                    message:
                        "Use application/json or multipart/form-data.",
                },
                { status: 400 }
            );
        }
    } catch {
        return Response.json(
            { message: "Invalid request body" },
            { status: 400 }
        );
    }

    const id =
        typeof input.id === "number"
            ? input.id
            : Number(input.id);

    if (!Number.isInteger(id) || id <= 0) {
        return Response.json(
            {
                message:
                    "A valid product ID is required.",
            },
            { status: 400 }
        );
    }

    const fields = validateFields(input);

    if ("error" in fields) {
        return Response.json(
            { message: fields.error },
            { status: 400 }
        );
    }

    const categoryRecord = await prisma.category.findFirst({
        where: {
            name: {
                equals: fields.data.category,
            },
        },
    });

    if (!categoryRecord) {
        return Response.json(
            {
                message: `Category "${fields.data.category}" does not exist. Please select or create a valid category.`,
            },
            { status: 400 }
        );
    }

    if (
        imageUrl &&
        !imageUrl.startsWith("http://") &&
        !imageUrl.startsWith("https://")
    ) {
        return Response.json(
            {
                message:
                    "Image URL must start with http:// or https://.",
            },
            { status: 400 }
        );
    }

    if (
        image &&
        !imageExtensions[image.type]
    ) {
        return Response.json(
            {
                message:
                    "Upload a valid JPEG, PNG, WebP, GIF, or AVIF image.",
            },
            { status: 400 }
        );
    }

    try {
        const existing =
            await prisma.product.findUnique({
                where: { id },
            });

        if (!existing) {
            return Response.json(
                { message: "Product not found" },
                { status: 404 }
            );
        }

        let imagePath = existing.image;

        if (image) {
            imagePath = await saveImage(image);
        } else if (imageUrl) {
            imagePath =
                await saveImageFromUrl(imageUrl);
        }

        const product =
            await prisma.product.update({
                where: { id },
                data: {
                    ...fields.data,
                    image: imagePath,
                },
            });

        return Response.json({
            success: true,
            product,
        });
    } catch (error) {
        console.error(
            "ADMIN UPDATE PRODUCT ERROR:",
            error
        );

        return Response.json(
            {
                message:
                    error instanceof Error
                        ? error.message
                        : "Product could not be updated",
            },
            { status: 500 }
        );
    }
}

/* DELETE - Delete product */
export async function DELETE(request: Request) {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const contentType =
        request.headers
            .get("content-type")
            ?.toLowerCase() ?? "";

    if (
        !contentType.includes(
            "application/json"
        )
    ) {
        return Response.json(
            {
                message:
                    "Use application/json with a product ID.",
            },
            { status: 400 }
        );
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return Response.json(
            { message: "Invalid JSON body" },
            { status: 400 }
        );
    }

    if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
    ) {
        return Response.json(
            {
                message:
                    "JSON body must contain a product ID.",
            },
            { status: 400 }
        );
    }

    const rawId =
        (body as Record<string, unknown>).id;

    const id =
        typeof rawId === "number"
            ? rawId
            : Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
        return Response.json(
            {
                message:
                    "A valid product ID is required.",
            },
            { status: 400 }
        );
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch product from database
            const product = await tx.product.findUnique({
                where: { id },
            });

            // 2. Product exists?
            if (!product) {
                return { status: 404, message: "Product not found." };
            }

            // 3. Stock === 0?
            if (product.stock > 0) {
                return {
                    status: 400,
                    message: "Only products with 0 stock can be deleted.",
                };
            }

            // 4. Handle CartItems: Remove only cart items associated with this product
            await tx.cartItem.deleteMany({
                where: { productId: id },
            });

            // 5. Handle Wishlist references: Remove only wishlist items for this product
            await tx.wishlist.deleteMany({
                where: { productId: id },
            });

            // 6. Safely handle OrderItem references:
            // Ensure historical order snapshot (productName and productImage) is preserved
            await tx.orderItem.updateMany({
                where: { productId: id },
                data: {
                    productName: product.name,
                    productImage: product.image,
                    productId: null,
                },
            });

            // 7. Delete the product record
            await tx.product.delete({
                where: { id },
            });

            return { status: 200, message: "Product deleted successfully." };
        });

        if (result.status !== 200) {
            return Response.json(
                { message: result.message },
                { status: result.status }
            );
        }

        return Response.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        console.error("ADMIN DELETE PRODUCT ERROR:", error);

        return Response.json(
            {
                message: "Product could not be deleted. Please try again.",
            },
            { status: 500 }
        );
    }
}