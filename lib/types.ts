/**
 * Shared TypeScript types used across multiple components, pages, and API routes.
 * All domain types are defined here to avoid duplicate definitions across the project.
 */

export type UserRole = "CUSTOMER" | "ADMIN";

export type RegistrationStatus = "PENDING" | "APPROVED" | "DECLINED";

export type User = {
    id?: number;
    name?: string;
    email: string;
    role?: UserRole | string;
    status?: RegistrationStatus | string;
    createdAt?: string;
};

export type Product = {
    id: number;
    name: string;
    price: number;
    discount: number;
    category: string;
    image: string;
    stock: number;
    createdAt?: string;
    updatedAt?: string;
};

export type CartItem = {
    id?: number;
    productId?: number;
    name: string;
    price: number;
    discount: number;
    category: string;
    image: string;
    quantity: number;
    stock?: number;
    isDeleted?: boolean;
};

export type WishlistItem = {
    id: number;
    productId: number;
    product: Product;
    userId?: number;
    createdAt?: string;
};

export type OrderProduct = {
    id?: number;
    name: string;
    image: string;
    price?: number;
};

export type OrderItem = {
    id: number;
    productId?: number | null;
    productName?: string | null;
    productImage?: string | null;
    quantity: number;
    price: number;
    product: OrderProduct;
};

export type OrderStatus =
    | "PENDING"
    | "COMPLETED"
    | "DELIVERED"
    | "CANCELLED"
    | string;

export type Order = {
    id: number;
    userId?: number;
    name?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    pincode?: string | null;
    total: number;
    status: OrderStatus;
    createdAt: string;
    items: OrderItem[];
};

export type AdminOrderStatus = "PENDING" | "DELIVERED" | "COMPLETED";

export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = [
    "PENDING",
    "DELIVERED",
    "COMPLETED",
];

export const ORDER_STATUS_OPTIONS: { label: AdminOrderStatus; value: AdminOrderStatus }[] = [
    { label: "PENDING", value: "PENDING" },
    { label: "DELIVERED", value: "DELIVERED" },
    { label: "COMPLETED", value: "COMPLETED" },
];

export type AdminOrderItem = {
    id: number;
    productId?: number | null;
    productName?: string | null;
    productImage?: string | null;
    quantity: number;
    price: number;
    product: {
        id?: number | null;
        name: string;
        image: string;
        price?: number;
    };
};

export type AdminOrder = {
    id: number;
    name: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    pincode: string | null;
    total: number;
    status: string;
    createdAt: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    items: AdminOrderItem[];
};

export type Category = {
    id: number;
    name: string;
    createdAt?: string;
    updatedAt?: string;
    productCount?: number;
    _count?: {
        products?: number;
    };
};

export type AdminSection =
    | "add-product"
    | "products"
    | "orders"
    | "analytics"
    | "users"
    | "categories"
    | "registrations";

export type RegistrationRequest = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: RegistrationStatus | string;
    createdAt: string;
};

export type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: "CUSTOMER" | "ADMIN" | string;
    status?: RegistrationStatus | string;
    createdAt: string;
    orderCount: number;
    wishlistCount: number;
    cartItemCount: number;
};

export type AdminUserDetail = {
    id: number;
    name: string;
    email: string;
    role: "CUSTOMER" | "ADMIN" | string;
    status?: RegistrationStatus | string;
    createdAt: string;
    orderCount: number;
    wishlistCount: number;
    cartItemCount: number;
    orders: {
        id: number;
        total: number;
        status: string;
        createdAt: string;
        itemCount: number;
    }[];
    wishlists: {
        id: number;
        product: {
            id: number;
            name: string;
            price: number;
            image: string;
            category: string;
        };
    }[];
    cartItems: {
        id: number;
        quantity: number;
        product: {
            id: number;
            name: string;
            price: number;
            image: string;
        };
    }[];
};

export type CartTotals = {
    subtotal: number;
    discountTotal: number;
    total: number;
    itemCount: number;
};

export type PaginationState = {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
};

export type OrderStatusFilter = "ALL" | "PENDING" | "COMPLETED" | "DELIVERED";
export type SalesPeriodFilter = "date" | "month" | "year";

export type OrderStatusChartPoint = {
    label: string;
    count: number;
};

export type SalesChartPoint = {
    label: string;
    sales: number;
};

