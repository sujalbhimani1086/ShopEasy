"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import PageLayout from "@/components/layout/PageLayout";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/ui/Pagination";
import StockControl from "@/components/admin/StockControl";
import SalesAnalytics from "@/components/admin/SalesAnalytics";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Dropdown from "@/components/ui/Dropdown";
import SearchBox from "@/components/ui/SearchBox";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ImageUpload from "@/components/ui/ImageUpload";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import TableSkeleton from "@/components/ui/TableSkeleton";
import CategoryManagement from "@/components/admin/CategoryManagement";
import RegistrationManagement from "@/components/admin/RegistrationManagement";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

import { formatDate, formatPrice, normalizeImageSrc, FALLBACK_IMAGE } from "@/lib/utils";
import { ADMIN_ORDER_STATUSES } from "@/lib/types";
import type {
  AdminOrder,
  AdminSection,
  AdminUser,
  AdminUserDetail,
  Product,
  User,
} from "@/lib/types";

const PRODUCTS_PER_PAGE = 12;
const ORDERS_PER_PAGE = 5;
const USERS_PER_PAGE = 8;

const VALID_SECTIONS: AdminSection[] = [
  "orders",
  "products",
  "add-product",
  "analytics",
  "users",
  "categories",
  "registrations",
];

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "2px solid var(--color-border)",
};

const thCenterStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid var(--color-border)",
  verticalAlign: "middle",
};

const tdCenterStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};

const tdTopStyle: React.CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid var(--color-border)",
  verticalAlign: "top",
};

export default function Admin() {
  return (
    <Suspense
      fallback={
        <PageLayout>
          <div className="container section" aria-busy="true">
            <Skeleton
              variant="title"
              width="240px"
              height="32px"
              style={{ marginBottom: "12px" }}
            />
            <Skeleton
              variant="text"
              width="360px"
              height="18px"
              style={{ marginBottom: "32px" }}
            />
            <TableSkeleton columns={6} rows={5} />
          </div>
        </PageLayout>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ==========================================
  // ACTIVE SECTION
  // ==========================================
  const sectionParam = searchParams.get("section") as AdminSection | null;
  const activeSection: AdminSection =
    sectionParam && VALID_SECTIONS.includes(sectionParam)
      ? sectionParam
      : "orders";

  // ==========================================
  // PRODUCT STATES
  // ==========================================
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // ==========================================
  // CATEGORY & FORM STATES
  // ==========================================
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Electronics");

  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const [stockValues, setStockValues] = useState<Record<number, string>>({});
  const [savingStockId, setSavingStockId] = useState<number | null>(null);

  // ==========================================
  // PRODUCT SEARCH / FILTER / SORT
  // ==========================================
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("ALL");
  const [productSort, setProductSort] = useState("default");
  const [productPage, setProductPage] = useState(1);

  // ==========================================
  // ORDER STATES
  // ==========================================
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [orderPage, setOrderPage] = useState(1);

  // ==========================================
  // CURRENT USER & USER MANAGEMENT STATES
  // ==========================================
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [userPage, setUserPage] = useState(1);

  // ==========================================
  // LOAD PRODUCTS
  // ==========================================
  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await fetch("/api/admin/products", {
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        showToast("error", "Access Denied", "Admin access required.");
        router.push("/products");
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setProducts(data);
      }
    } catch {
      showToast("error", "Error", "Failed to load products.");
    } finally {
      setProductsLoading(false);
    }
  }, [router]);

  // ==========================================
  // LOAD ORDERS
  // ==========================================
  const loadOrders = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setOrdersLoading(true);
        }

        const response = await fetch("/api/admin/orders", {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          showToast("error", "Access Denied", "Admin access required.");
          router.push("/products");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load orders.");
        }

        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (error) {
        console.error("ADMIN ORDERS ERROR:", error);
        showToast("error", "Error", "Failed to load customer orders.");
      } finally {
        setOrdersLoading(false);
      }
    },
    [router],
  );

  // ==========================================
  // LOAD CATEGORIES
  // ==========================================
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      }
    } catch (err) {
      console.error("Failed to load categories for dropdown:", err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // ==========================================
  // INITIAL LOAD & EVENTS SYNC
  // ==========================================
  useEffect(() => {
    void loadProducts();
    void loadOrders(true);
    void loadCategories();

    const handleCategoriesUpdated = () => {
      void loadCategories();
    };

    window.addEventListener("categoriesUpdated", handleCategoriesUpdated);
    return () => {
      window.removeEventListener("categoriesUpdated", handleCategoriesUpdated);
    };
  }, [loadProducts, loadOrders, loadCategories]);

  // Refetch when switching tabs into orders, products, or categories
  useEffect(() => {
    if (activeSection === "orders") {
      void loadOrders(orders.length === 0);
    } else if (activeSection === "products") {
      void loadProducts();
      void loadCategories();
    } else if (activeSection === "add-product" || activeSection === "categories") {
      void loadCategories();
    }
  }, [activeSection, loadOrders, loadProducts, loadCategories, orders.length]);

  // Live sync orders (auto-poll every 5s, tab focus, and events)
  useEffect(() => {
    if (activeSection !== "orders") return;

    const interval = setInterval(() => {
      void loadOrders(false);
    }, 5000);

    function handleRefresh() {
      if (document.visibilityState === "visible") {
        void loadOrders(false);
      }
    }

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);
    window.addEventListener("ordersUpdated", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
      window.removeEventListener("ordersUpdated", handleRefresh);
    };
  }, [activeSection, loadOrders]);

  // ==========================================
  // PRODUCT CATEGORIES
  // ==========================================
  const productCategories = Array.from(
    new Set([
      ...categories.map((c) => c.name.trim()),
      ...products.map((product) => product.category.trim()),
    ].filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  // ==========================================
  // FILTER & SORT PRODUCTS
  // ==========================================
  const filteredProducts = products.filter((product) => {
    const search = productSearch.trim().toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(search);
    const matchesCategory =
      productCategory === "ALL" || product.category === productCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (productSort) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "discount-desc":
        return b.discount - a.discount;
      case "discount-asc":
        return a.discount - b.discount;
      default:
        return a.id - b.id;
    }
  });

  // ==========================================
  // PRODUCT PAGINATION
  // ==========================================
  const totalProductPages = Math.max(
    1,
    Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE),
  );
  const safeProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = sortedProducts.slice(
    (safeProductPage - 1) * PRODUCTS_PER_PAGE,
    safeProductPage * PRODUCTS_PER_PAGE,
  );

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, productCategory, productSort]);

  useEffect(() => {
    if (productPage > totalProductPages) {
      setProductPage(totalProductPages);
    }
  }, [productPage, totalProductPages]);

  // ==========================================
  // ORDER FILTERING & PAGINATION
  // ==========================================
  const orderStatusFilterOptions = [
    { label: "All", value: "ALL" },
    { label: "⏳ PENDING", value: "PENDING" },
    { label: "🚚 DELIVERED", value: "DELIVERED" },
    { label: "✅ COMPLETED", value: "COMPLETED" },
  ];

  const filteredOrders =
    statusFilter === "ALL"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  const totalOrderPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );
  const safeOrderPage = Math.min(orderPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice(
    (safeOrderPage - 1) * ORDERS_PER_PAGE,
    safeOrderPage * ORDERS_PER_PAGE,
  );

  useEffect(() => {
    setOrderPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (orderPage > totalOrderPages) {
      setOrderPage(totalOrderPages);
    }
  }, [orderPage, totalOrderPages]);

  // ==========================================
  // USER PAGINATION
  // ==========================================
  const totalUserPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const safeUserPage = Math.min(userPage, totalUserPages);
  const paginatedUsers = users.slice(
    (safeUserPage - 1) * USERS_PER_PAGE,
    safeUserPage * USERS_PER_PAGE,
  );

  useEffect(() => {
    if (userPage > totalUserPages) {
      setUserPage(totalUserPages);
    }
  }, [userPage, totalUserPages]);

  // ==========================================
  // CLEAR PRODUCT FORM
  // ==========================================
  function clearForm() {
    setName("");
    setPrice("");
    setDiscount("");
    setStock("");
    setCategory(categories.length > 0 ? categories[0].name : "");
    setImage(null);
    setImageUrl("");
    setEditId(null);
    setEditingProduct(null);

    const fileInput = document.getElementById("product-image") as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = "";
    }
  }

  // ==========================================
  // NAVIGATION HELPERS
  // ==========================================
  function openAddProduct() {
    clearForm();
    router.push("/admin?section=add-product");
  }

  function backToOrders() {
    clearForm();
    router.push("/admin?section=orders");
  }

  // ==========================================
  // EDIT PRODUCT
  // ==========================================
  function editProduct(product: Product) {
    setEditId(product.id);
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    setDiscount(String(product.discount));
    setStock(String(product.stock ?? 0));
    setCategory(product.category);
    setImage(null);
    setImageUrl("");

    router.push("/admin?section=add-product");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ==========================================
  // SAVE PRODUCT
  // ==========================================
  async function saveProduct() {
    if (!name.trim() || price === "" || stock === "" || !category.trim()) {
      showToast("error", "Missing Fields", "Please fill all required fields.");
      return;
    }

    const numericPrice = Number(price);
    const numericDiscount = Number(discount || 0);
    const numericStock = Number(stock);

    if (!Number.isInteger(numericPrice) || numericPrice < 0) {
      showToast("error", "Invalid Price", "Price must be 0 or more.");
      return;
    }

    if (
      !Number.isInteger(numericDiscount) ||
      numericDiscount < 0 ||
      numericDiscount > 100
    ) {
      showToast("error", "Invalid Discount", "Discount must be between 0 and 100.");
      return;
    }

    if (!Number.isInteger(numericStock) || numericStock < 0) {
      showToast("error", "Invalid Stock", "Stock must be 0 or more.");
      return;
    }

    if (!editId && !image && !imageUrl.trim()) {
      showToast(
        "error",
        "Image Required",
        "Please select an image or enter an image URL.",
      );
      return;
    }

    const wasEditing = editId !== null;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("price", price);
      formData.append("discount", discount || "0");
      formData.append("stock", stock);
      formData.append("category", category.trim());

      if (image) {
        formData.append("image", image);
      } else if (imageUrl.trim()) {
        formData.append("imageUrl", imageUrl.trim());
      }

      let response: Response;
      if (editId) {
        formData.append("id", String(editId));
        response = await fetch("/api/admin/products", {
          method: "PUT",
          body: formData,
        });
      } else {
        response = await fetch("/api/admin/products", {
          method: "POST",
          body: formData,
        });
      }

      const data = await response.json();
      if (!response.ok) {
        showToast("error", "Failed", data.message || "Something went wrong.");
        return;
      }

      showToast(
        "success",
        wasEditing ? "Product Updated" : "Product Added",
        wasEditing
          ? `${name} has been updated successfully.`
          : `${name} has been added successfully.`,
      );

      clearForm();
      await loadProducts();
      router.push("/admin?section=products");
    } catch (error) {
      console.error("SAVE PRODUCT ERROR:", error);
      showToast("error", "Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // UPDATE STOCK
  // ==========================================
  async function updateStock(product: Product) {
    const value = stockValues[product.id] ?? String(product.stock);
    const newStock = Number(value);

    if (!Number.isInteger(newStock) || newStock < 0) {
      showToast("error", "Invalid Stock", "Stock must be 0 or more.");
      return;
    }

    setSavingStockId(product.id);

    try {
      const formData = new FormData();
      formData.append("id", String(product.id));
      formData.append("name", product.name);
      formData.append("price", String(product.price));
      formData.append("discount", String(product.discount));
      formData.append("category", product.category);
      formData.append("stock", String(newStock));

      const response = await fetch("/api/admin/products", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        showToast("error", "Failed", data.message || "Could not update stock.");
        return;
      }

      showToast(
        "success",
        "Stock Updated",
        `${product.name} stock updated to ${newStock}.`,
      );

      await loadProducts();
      setStockValues((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      });
    } catch {
      showToast("error", "Error", "Could not update stock.");
    } finally {
      setSavingStockId(null);
    }
  }

  // ==========================================
  // RESTOCK ALL (OUT OF STOCK)
  // ==========================================
  async function restockAll() {
    const outOfStockProducts = products.filter((p) => p.stock === 0);

    if (outOfStockProducts.length === 0) {
      showToast(
        "success",
        "No Restock Needed",
        "All products already have stock.",
      );
      return;
    }

    setLoading(true);

    try {
      const results = await Promise.all(
        outOfStockProducts.map(async (product) => {
          const formData = new FormData();
          formData.append("id", String(product.id));
          formData.append("name", product.name);
          formData.append("price", String(product.price));
          formData.append("discount", String(product.discount));
          formData.append("category", product.category);
          formData.append("stock", "5");

          const response = await fetch("/api/admin/products", {
            method: "PUT",
            body: formData,
          });

          return response.ok;
        }),
      );

      const successCount = results.filter(Boolean).length;
      await loadProducts();

      showToast(
        "success",
        "Restocked",
        `${successCount} product${successCount === 1 ? "" : "s"} restocked to 5.`,
      );
    } catch {
      showToast("error", "Restock Failed", "Could not restock products.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // DELETE PRODUCT
  // ==========================================
  function handleDeleteProductClick(id: number) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (product.stock > 0) {
      showToast(
        "error",
        "Cannot Delete",
        "Only products with 0 stock can be deleted.",
      );
      return;
    }

    setProductToDelete(product);
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;

    setDeletingProduct(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productToDelete.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        showToast(
          "error",
          "Failed",
          data.message || "Product could not be deleted. Please try again.",
        );
        return;
      }

      showToast("success", "Deleted", data.message || "Product deleted successfully.");
      setProductToDelete(null);
      await loadProducts();
    } catch {
      showToast("error", "Error", "Product could not be deleted. Please try again.");
    } finally {
      setDeletingProduct(false);
    }
  }

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================
  async function updateOrderStatus(orderId: number, status: AdminOrder["status"]) {
    setUpdatingOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });

      const data = await response.json();
      if (!response.ok) {
        showToast("error", "Update Failed", data.message || "Could not update order.");
        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status } : order,
        ),
      );

      window.dispatchEvent(new Event("ordersUpdated"));
      showToast("success", "Order Updated", `Order #${orderId} is now ${status}.`);
    } catch {
      showToast("error", "Error", "Could not update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // ==========================================
  // DELETE ORDER
  // ==========================================
  async function deleteOrder(orderId: number) {
    if (!confirm(`Delete order #${orderId}?`)) {
      return;
    }

    setDeletingOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();
      if (!response.ok) {
        showToast("error", "Delete Failed", data.message || "Could not delete order.");
        return;
      }

      setOrders((current) => current.filter((order) => order.id !== orderId));
      window.dispatchEvent(new Event("ordersUpdated"));
      showToast("success", "Order Deleted", `Order #${orderId} has been deleted.`);
    } catch {
      showToast("error", "Error", "Could not delete order.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  // ==========================================
  // LOAD USERS
  // ==========================================
  const loadUsers = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setUsersLoading(true);
        }

        const params = new URLSearchParams();
        if (userSearch.trim()) {
          params.set("search", userSearch.trim());
        }
        if (userRoleFilter && userRoleFilter !== "ALL") {
          params.set("role", userRoleFilter);
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          showToast("error", "Access Denied", "Admin access required.");
          router.push("/products");
          return;
        }

        const data = await response.json();
        if (response.ok) {
          setUsers(Array.isArray(data) ? data : []);
        } else {
          showToast("error", "Error", data.message || "Failed to load users.");
        }
      } catch {
        showToast("error", "Error", "Failed to load users.");
      } finally {
        setUsersLoading(false);
      }
    },
    [router, userSearch, userRoleFilter],
  );

  useEffect(() => {
    if (activeSection === "users") {
      loadUsers(true);
    }
  }, [activeSection, loadUsers]);

  // ==========================================
  // VIEW USER DETAILS
  // ==========================================
  async function openUserDetails(userId: number) {
    setLoadingUserDetail(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        showToast("error", "Error", data.message || "Could not load user details.");
        return;
      }
      setSelectedUser(data);
    } catch {
      showToast("error", "Error", "Failed to load user details.");
    } finally {
      setLoadingUserDetail(false);
    }
  }

  // ==========================================
  // UPDATE USER ROLE
  // ==========================================
  async function updateUserRole(userId: number, role: string) {
    if (currentUser?.id === userId && role !== "ADMIN") {
      showToast(
        "error",
        "Action Blocked",
        "You cannot revoke your own admin access.",
      );
      return;
    }

    setUpdatingUserRoleId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();
      if (!response.ok) {
        showToast("error", "Update Failed", data.message || "Could not update user role.");
        return;
      }

      setUsers((current) =>
        current.map((u) => (u.id === userId ? { ...u, role } : u)),
      );

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, role } : null));
      }

      showToast("success", "Role Updated", `User role is now ${role}.`);
    } catch {
      showToast("error", "Error", "Could not update user role.");
    } finally {
      setUpdatingUserRoleId(null);
    }
  }

  // ==========================================
  // DELETE USER
  // ==========================================
  async function deleteUser(user: {
    id: number;
    name: string;
    email: string;
    role: string;
  }) {
    if (currentUser?.id === user.id) {
      showToast(
        "error",
        "Action Blocked",
        "You cannot delete your own admin account.",
      );
      return;
    }

    const confirmMsg = `Are you sure you want to permanently delete user "${user.name}" (${user.email})?\n\nAll associated data (orders, wishlist, and cart) will also be deleted.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        showToast("error", "Delete Failed", data.message || "Could not delete user.");
        return;
      }

      setUsers((current) => current.filter((u) => u.id !== user.id));
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
      }

      showToast("success", "User Deleted", `User ${user.name} has been deleted.`);
    } catch {
      showToast("error", "Error", "Could not delete user.");
    } finally {
      setDeletingUserId(null);
    }
  }

  // ==========================================
  // ADD / UPDATE PRODUCT TAB
  // ==========================================
  if (activeSection === "add-product") {
    return (
      <PageLayout>
        <section className="container">
          <SectionHeader
            title={editId ? "Update Product" : "Add Product"}
            subtitle={
              editId
                ? "Update product information"
                : "Add a new product to your store"
            }
          />

          <div style={{ maxWidth: "650px", margin: "30px auto" }}>
            <div className="admin-form-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  gap: "12px",
                }}
              >
                <h3>{editId ? "Update Product" : "Add New Product"}</h3>
                <button
                  type="button"
                  className="btn"
                  onClick={backToOrders}
                  disabled={loading}
                >
                  ← Orders
                </button>
              </div>

              <div className="admin-form">
                {editingProduct && (
                  <div className="form-group">
                    <p><strong>Product ID:</strong> {editingProduct.id}</p>
                    {editingProduct.createdAt && (
                      <p><strong>Created:</strong> {formatDate(editingProduct.createdAt)}</p>
                    )}
                    {editingProduct.updatedAt && (
                      <p><strong>Last updated:</strong> {formatDate(editingProduct.updatedAt)}</p>
                    )}
                    <p><strong>Current image:</strong></p>
                    <Image
                      src={normalizeImageSrc(editingProduct.image)}
                      alt={`Current ${editingProduct.name}`}
                      width={120}
                      height={90}
                      unoptimized
                      style={{ objectFit: "cover", borderRadius: 8 }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. iPhone 16 Pro"
                  />
                </div>

                <div className="admin-form-row">
                  <div className="form-group">
                    <label className="form-label">Price (₹)</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 79999"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Discount (%)</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="e.g. 50"
                  />
                  <small>Enter 0 if the product is out of stock.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="product-category-dropdown" className="form-label">
                    Category
                  </label>
                  {categoriesLoading && categories.length === 0 ? (
                    <div style={{ height: "46px", display: "flex", alignItems: "center" }}>
                      <Skeleton width="100%" height="46px" borderRadius="10px" />
                    </div>
                  ) : (
                    <Dropdown
                      id="product-category-dropdown"
                      value={category}
                      onChange={(val) => setCategory(val)}
                      placeholder="Select a category"
                      options={
                        categories.length > 0
                          ? categories.map((c) => ({
                              label: c.name,
                              value: c.name,
                            }))
                          : productCategories.map((catName) => ({
                              label: catName,
                              value: catName,
                            }))
                      }
                      style={{ width: "100%", minHeight: "46px" }}
                    />
                  )}
                  {categories.length === 0 && !categoriesLoading && (
                    <small style={{ color: "var(--color-text-secondary)", marginTop: "4px" }}>
                      No categories found.{" "}
                      <button
                        type="button"
                        onClick={() => router.push("/admin?section=categories")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-primary)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: "inherit",
                        }}
                      >
                        Create one in Category Management
                      </button>
                    </small>
                  )}
                </div>

                <ImageUpload
                  file={image}
                  imageUrl={imageUrl}
                  onFileChange={(newFile) => {
                    setImage(newFile);
                    if (newFile) {
                      setImageUrl("");
                    }
                  }}
                  onUrlChange={(url) => {
                    setImageUrl(url);
                    if (url.trim()) {
                      setImage(null);
                    }
                  }}
                  helperText={
                    editId
                      ? "Leave both empty to keep the existing image."
                      : undefined
                  }
                />

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={saveProduct}
                  loading={loading}
                >
                  {editId ? "Update Product" : "Add Product"}
                </Button>

                {editId && (
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={clearForm}
                    disabled={loading}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  // ==========================================
  // PRODUCT DETAILS TAB
  // ==========================================
  if (activeSection === "products") {
    return (
      <PageLayout>
        <section className="container">
          <SectionHeader
            title="Product Details"
            subtitle="Update, manage and delete your products"
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={openAddProduct}
            >
              ➕ Add Product
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={restockAll}
              disabled={loading}
            >
              {loading ? "Restocking..." : "Restock All"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 1fr) 225px 225px",
              gap: "18px",
              padding: "18px",
              marginBottom: "24px",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              background: "var(--color-bg)",
            }}
          >
            <SearchBox
              value={productSearch}
              onChange={(val) => setProductSearch(val)}
              placeholder="   Search products..."
              style={{ minHeight: "48px" }}
            />

            <Dropdown
              value={productCategory}
              onChange={(val) => setProductCategory(val)}
              aria-label="Filter by category"
              options={[
                { label: "All Categories", value: "ALL" },
                ...productCategories.map((categoryName) => ({
                  label: categoryName,
                  value: categoryName,
                })),
              ]}
              style={{ minHeight: "48px" }}
            />

            <Dropdown
              value={productSort}
              onChange={(val) => setProductSort(val)}
              aria-label="Sort products"
              options={[
                { label: "Sort By", value: "default" },
                { label: "Name: A - Z", value: "name-asc" },
                { label: "Name: Z - A", value: "name-desc" },
                { label: "Price: Low to High", value: "price-asc" },
                { label: "Price: High to Low", value: "price-desc" },
                { label: "Discount: High to Low", value: "discount-desc" },
                { label: "Discount: Low to High", value: "discount-asc" },
              ]}
              style={{ minHeight: "48px" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <p style={{ margin: 0, opacity: 0.75 }}>
              Showing{" "}
              {sortedProducts.length === 0
                ? 0
                : (safeProductPage - 1) * PRODUCTS_PER_PAGE + 1}
              -
              {Math.min(
                safeProductPage * PRODUCTS_PER_PAGE,
                sortedProducts.length,
              )}{" "}
              of {sortedProducts.length} products
            </p>
          </div>

          <div className="product-grid stagger-children" aria-busy={productsLoading}>
            {productsLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="admin-product-wrapper">
                  <ProductCardSkeleton adminMode />
                </div>
              ))
            ) : paginatedProducts.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "40px",
                  textAlign: "center",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                }}
              >
                {products.length === 0
                  ? "No products found."
                  : "No products match your search or filter."}
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <div key={product.id} className="admin-product-wrapper">
                  <ProductCard
                    product={product}
                    adminMode
                    onEdit={editProduct}
                  />

                  <StockControl
                    productId={product.id}
                    productName={product.name}
                    stock={product.stock}
                    value={stockValues[product.id] ?? String(product.stock)}
                    onValueChange={(val) =>
                      setStockValues((prev) => ({
                        ...prev,
                        [product.id]: val,
                      }))
                    }
                    onSave={() => updateStock(product)}
                    isSaving={savingStockId === product.id}
                    onDelete={() => handleDeleteProductClick(product.id)}
                    isDeleting={deletingProduct && productToDelete?.id === product.id}
                  />
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={safeProductPage}
            totalPages={totalProductPages}
            onPageChange={setProductPage}
          />

          <ConfirmDialog
            open={Boolean(productToDelete)}
            title="Delete Product?"
            variant="danger"
            loading={deletingProduct}
            confirmText="Delete"
            cancelText="Cancel"
            onCancel={() => setProductToDelete(null)}
            onConfirm={() => void confirmDeleteProduct()}
            message="This product has 0 stock. Are you sure you want to permanently delete it?"
          />
        </section>
      </PageLayout>
    );
  }

  // ==========================================
  // ANALYTICS TAB
  // ==========================================
  if (activeSection === "analytics") {
    return (
      <PageLayout>
        <section className="admin-analytics-page">
          <SectionHeader
            title="Sales & Orders Analytics"
            subtitle="Real-time visual insights into store performance and fulfillment"
          />
          <SalesAnalytics />
        </section>
      </PageLayout>
    );
  }

  // ==========================================
  // CATEGORIES TAB
  // ==========================================
  if (activeSection === "categories") {
    return (
      <PageLayout>
        <div style={{ paddingTop: "20px", paddingBottom: "40px" }}>
          <CategoryManagement onCategoriesChanged={loadCategories} />
        </div>
      </PageLayout>
    );
  }

  // ==========================================
  // REGISTRATIONS TAB
  // ==========================================
  if (activeSection === "registrations") {
    return (
      <PageLayout>
        <div style={{ paddingTop: "20px", paddingBottom: "40px" }}>
          <RegistrationManagement />
        </div>
      </PageLayout>
    );
  }

  // ==========================================
  // USERS TAB
  // ==========================================
  if (activeSection === "users") {
    return (
      <PageLayout>
        <section className="admin-users-page">
          <SectionHeader
            title="User Management"
            subtitle="View and manage store users, roles, and customer activity"
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 1fr) 220px",
              gap: "18px",
              padding: "18px",
              marginBottom: "24px",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              background: "var(--color-bg)",
            }}
          >
            <SearchBox
              value={userSearch}
              onChange={(val) => {
                setUserSearch(val);
                setUserPage(1);
              }}
              placeholder="Search users by name or email..."
              style={{ minHeight: "48px" }}
            />

            <Dropdown
              value={userRoleFilter}
              onChange={(val) => {
                setUserRoleFilter(val);
                setUserPage(1);
              }}
              aria-label="Filter by role"
              options={[
                { label: "All Roles", value: "ALL" },
                { label: "Customer", value: "CUSTOMER" },
                { label: "Admin", value: "ADMIN" },
              ]}
              style={{ minHeight: "48px" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                fontSize: "14px",
              }}
            >
              Showing <strong>{users.length}</strong>{" "}
              {users.length === 1 ? "user" : "users"}
            </p>
          </div>

          {usersLoading ? (
            <TableSkeleton
              columns={8}
              rows={5}
              headers={[
                "User",
                "Email",
                "Role",
                "Joined Date",
                "Orders",
                "Wishlist",
                "Cart",
                "Actions",
              ]}
            />
          ) : users.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No users found"
              description="No users found matching your search."
            />
          ) : (
            <>
              <div style={{ width: "100%", overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "900px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Role</th>
                      <th style={thStyle}>Joined Date</th>
                      <th style={thCenterStyle}>Orders</th>
                      <th style={thCenterStyle}>Wishlist</th>
                      <th style={thCenterStyle}>Cart Items</th>
                      <th style={thCenterStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => {
                      const isSelf = currentUser?.id === user.id;

                      return (
                        <tr key={user.id}>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div className="user-avatar-badge">
                                {(user.name || user.email || "U").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong>{user.name}</strong>
                                {isSelf && (
                                  <span
                                    style={{
                                      marginLeft: "6px",
                                      fontSize: "11px",
                                      color: "var(--color-primary)",
                                      fontWeight: 700,
                                    }}
                                  >
                                    (You)
                                  </span>
                                )}
                                <div style={{ fontSize: "12px", opacity: 0.7 }}>
                                  ID: #{user.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={tdStyle}>{user.email}</td>

                          <td style={tdStyle}>
                            <span
                              className={`badge ${
                                user.role === "ADMIN" ? "badge-dark" : "badge-primary"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>

                          <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                            {formatDate(user.createdAt)}
                          </td>

                          <td style={tdCenterStyle}>
                            <strong>{user.orderCount}</strong>
                          </td>

                          <td style={tdCenterStyle}>
                            <strong>{user.wishlistCount}</strong>
                          </td>

                          <td style={tdCenterStyle}>
                            <strong>{user.cartItemCount}</strong>
                          </td>

                          <td style={tdStyle}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => openUserDetails(user.id)}
                                disabled={loadingUserDetail}
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                              >
                                👁️ View
                              </button>

                              <select
                                className="form-select"
                                value={user.role}
                                disabled={updatingUserRoleId === user.id || isSelf}
                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  width: "115px",
                                  height: "32px",
                                  minHeight: "32px",
                                }}
                                title={
                                  isSelf
                                    ? "You cannot change your own role"
                                    : "Change user role"
                                }
                              >
                                <option value="CUSTOMER">CUSTOMER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>

                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={deletingUserId === user.id || isSelf}
                                onClick={() => deleteUser(user)}
                                title={
                                  isSelf
                                    ? "You cannot delete your own account"
                                    : "Delete user"
                                }
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                              >
                                {deletingUserId === user.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={safeUserPage}
                totalPages={totalUserPages}
                onPageChange={setUserPage}
              />
            </>
          )}

          {/* User Details Modal */}
          {selectedUser && (
            <Modal
              open={Boolean(selectedUser)}
              onClose={() => setSelectedUser(null)}
              maxWidth="760px"
              title={
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    className="user-avatar-badge"
                    style={{
                      width: "46px",
                      height: "46px",
                      fontSize: "18px",
                    }}
                  >
                    {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px" }}>
                      {selectedUser.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: "13px", opacity: 0.7 }}>
                      {selectedUser.email}
                    </p>
                  </div>
                  <Badge variant={selectedUser.role === "ADMIN" ? "dark" : "primary"}>
                    {selectedUser.role}
                  </Badge>
                </div>
              }
              footer={
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                    width: "100%",
                  }}
                >
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={
                      deletingUserId === selectedUser.id ||
                      currentUser?.id === selectedUser.id
                    }
                    loading={deletingUserId === selectedUser.id}
                    onClick={() => deleteUser(selectedUser)}
                  >
                    Delete User
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    Close
                  </Button>
                </div>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Quick Metrics */}
                <div className="user-stats-grid">
                  <div className="user-stat-card">
                    <div className="user-stat-number">{selectedUser.orderCount}</div>
                    <div className="user-stat-label">Orders Placed</div>
                  </div>
                  <div className="user-stat-card">
                    <div className="user-stat-number">{selectedUser.wishlistCount}</div>
                    <div className="user-stat-label">Wishlist Items</div>
                  </div>
                  <div className="user-stat-card">
                    <div className="user-stat-number">{selectedUser.cartItemCount}</div>
                    <div className="user-stat-label">Cart Items</div>
                  </div>
                </div>

                {/* Account Details & Role Switcher */}
                <div
                  style={{
                    padding: "16px",
                    background: "var(--color-bg-subtle)",
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                      User ID: <strong>#{selectedUser.id}</strong> • Joined:{" "}
                      <strong>{formatDate(selectedUser.createdAt)}</strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>Role:</span>
                    <select
                      className="form-select"
                      value={selectedUser.role}
                      disabled={
                        updatingUserRoleId === selectedUser.id ||
                        currentUser?.id === selectedUser.id
                      }
                      onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
                      style={{
                        width: "130px",
                        height: "36px",
                        padding: "4px 8px",
                        fontSize: "13px",
                      }}
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>

                {/* Recent Orders */}
                <div>
                  <h4 style={{ marginBottom: "12px", fontSize: "15px" }}>
                    Recent Orders ({selectedUser.orders.length})
                  </h4>
                  {selectedUser.orders.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                      No orders placed by this user yet.
                    </p>
                  ) : (
                    <div style={{ width: "100%", overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "13px",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "var(--color-bg-subtle)" }}>
                            <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>Order</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>Date</th>
                            <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--color-border)" }}>Items</th>
                            <th style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid var(--color-border)" }}>Total</th>
                            <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid var(--color-border)" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUser.orders.map((order) => (
                            <tr key={order.id}>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)" }}>
                                <strong>#{order.id}</strong>
                              </td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)" }}>
                                {formatDate(order.createdAt)}
                              </td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>
                                {order.itemCount}
                              </td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)", textAlign: "right", fontWeight: 700 }}>
                                {formatPrice(order.total)}
                              </td>
                              <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--color-border)", textAlign: "center" }}>
                                <span className="badge badge-primary">{order.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Wishlist Items */}
                <div>
                  <h4 style={{ marginBottom: "12px", fontSize: "15px" }}>
                    Wishlist Items ({selectedUser.wishlists.length})
                  </h4>
                  {selectedUser.wishlists.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                      Wishlist is empty.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {selectedUser.wishlists.map((w) => (
                        <div
                          key={w.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 12px",
                            background: "var(--color-bg-subtle)",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <Image
                            src={normalizeImageSrc(w.product.image)}
                            alt={w.product.name}
                            width={36}
                            height={36}
                            unoptimized
                            style={{ objectFit: "cover", borderRadius: "6px" }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {w.product.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                              {formatPrice(w.product.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart Items */}
                <div>
                  <h4 style={{ marginBottom: "12px", fontSize: "15px" }}>
                    Current Cart ({selectedUser.cartItems.length})
                  </h4>
                  {selectedUser.cartItems.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                      Cart is currently empty.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {selectedUser.cartItems.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 12px",
                            background: "var(--color-bg-subtle)",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <Image
                            src={normalizeImageSrc(item.product.image)}
                            alt={item.product.name}
                            width={36}
                            height={36}
                            unoptimized
                            style={{ objectFit: "cover", borderRadius: "6px" }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.product.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                              Qty: {item.quantity} • {formatPrice(item.product.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}
        </section>
      </PageLayout>
    );
  }

  // ==========================================
  // ORDER MANAGEMENT TAB (DEFAULT)
  // ==========================================
  return (
    <PageLayout>
      <section className="admin-orders-page">
        <SectionHeader
          title="Order Management"
          subtitle="View and manage all customer orders"
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="order-status-filter"
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--color-text-secondary, #a3a3a3)",
            }}
          >
            Filter by Status
          </label>

          <Dropdown
            id="order-status-filter"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={orderStatusFilterOptions}
            style={{ minWidth: "180px" }}
          />
        </div>

        {ordersLoading ? (
          <TableSkeleton
            columns={7}
            rows={5}
            headers={[
              "Order ID",
              "Customer",
              "Address",
              "Items",
              "Total",
              "Status",
              "Action",
            ]}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No orders found."
            description="New orders will appear here when customers check out."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon="📦"
            title={
              statusFilter === "PENDING"
                ? "No pending orders found."
                : statusFilter === "DELIVERED"
                  ? "No delivered orders found."
                  : statusFilter === "COMPLETED"
                    ? "No completed orders found."
                    : "No orders found."
            }
            description={
              statusFilter === "ALL"
                ? "No orders found."
                : `There are currently no orders with ${statusFilter.toLowerCase()} status.`
            }
          />
        ) : (
          <>
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Order ID</th>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Products</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={tdTopStyle}>
                        <strong>#{order.id}</strong>
                        <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.7 }}>
                          {formatDate(order.createdAt)}
                        </div>
                      </td>

                      <td style={tdTopStyle}>
                        <strong>{order.name || order.user?.name || "Customer"}</strong>
                        <div style={{ fontSize: "12px", marginTop: "4px" }}>
                          {order.city || "-"}
                        </div>
                      </td>

                      <td style={tdTopStyle}>
                        {order.email || order.user?.email || "-"}
                        {order.pincode && (
                          <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.7 }}>
                            PIN: {order.pincode}
                          </div>
                        )}
                      </td>

                      <td style={tdTopStyle}>
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            <Image
                              src={normalizeImageSrc(
                                item.product?.image ||
                                  item.productImage ||
                                  FALLBACK_IMAGE,
                              )}
                              alt={
                                item.product?.name ||
                                item.productName ||
                                "Product"
                              }
                              width={40}
                              height={40}
                              unoptimized
                              style={{ objectFit: "cover", borderRadius: "6px" }}
                            />

                            <div>
                              <div>
                                {item.product?.name ||
                                  item.productName ||
                                  "Product Unavailable"}
                              </div>
                              <small>Qty: {item.quantity}</small>
                            </div>
                          </div>
                        ))}
                      </td>

                      <td style={{ ...tdTopStyle, whiteSpace: "nowrap" }}>
                        <strong>{formatPrice(order.total)}</strong>
                      </td>

                      <td style={tdTopStyle}>
                        <Dropdown
                          value={order.status}
                          disabled={updatingOrderId === order.id}
                          options={ADMIN_ORDER_STATUSES.map((status) => ({
                            label: status,
                            value: status,
                          }))}
                          onChange={(val) => updateOrderStatus(order.id, val)}
                        />
                      </td>

                      <td style={tdTopStyle}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteOrder(order.id)}
                          disabled={deletingOrderId === order.id}
                          loading={deletingOrderId === order.id}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={safeOrderPage}
              totalPages={totalOrderPages}
              onPageChange={setOrderPage}
            />
          </>
        )}
      </section>
    </PageLayout>
  );
}
