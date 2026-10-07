"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import PageLayout from "@/components/layout/PageLayout";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Dropdown from "@/components/ui/Dropdown";
import Skeleton from "@/components/ui/Skeleton";

import {
  formatDate,
  formatPrice,
  normalizeImageSrc,
  FALLBACK_IMAGE,
} from "@/lib/utils";

import { ADMIN_ORDER_STATUSES } from "@/lib/types";
import type { AdminOrder } from "@/lib/types";

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/admin/orders", {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (response.status === 403) {
          showToast("error", "Access Denied", "Admin access required.");

          router.push("/products");
          return;
        }

        const data = await response.json();

        if (!response.ok || !Array.isArray(data)) {
          throw new Error(data.message || "Could not load orders.");
        }

        setOrders(data as AdminOrder[]);
        setError("");
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Could not load orders.";

        setError(message);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    void loadOrders(true);

    const interval = window.setInterval(() => void loadOrders(), 5000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadOrders();
      }
    }

    window.addEventListener("focus", refreshWhenVisible);

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);

      window.removeEventListener("focus", refreshWhenVisible);

      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadOrders]);

  async function updateStatus(orderId: number, status: AdminOrder["status"]) {
    setBusyOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(
          "error",
          "Update Failed",
          data.message || "Could not update order status.",
        );

        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order,
        ),
      );

      window.dispatchEvent(new Event("ordersUpdated"));

      showToast(
        "success",
        "Order Updated",
        `Order #${orderId} is now ${status.toLowerCase()}.`,
      );
    } catch {
      showToast("error", "Update Failed", "Could not update order status.");
    } finally {
      setBusyOrderId(null);
    }
  }

  async function deleteOrder(orderId: number) {
    if (!window.confirm(`Delete order #${orderId}? This cannot be undone.`)) {
      return;
    }

    setBusyOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(
          "error",
          "Delete Failed",
          data.message || "Could not delete order.",
        );

        return;
      }

      setOrders((current) => current.filter((order) => order.id !== orderId));

      window.dispatchEvent(new Event("ordersUpdated"));

      showToast("success", "Order Deleted", `Order #${orderId} was deleted.`);
    } catch {
      showToast("error", "Delete Failed", "Could not delete order.");
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <PageLayout>
      <section
        className="container"
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <SectionHeader
          title="My Orders"
          subtitle={`${
            orders.filter((order) => order.status === "PENDING").length
          } pending orders`}
        />

        {loading ? (
          <div
            className="orders-list"
            aria-busy="true"
            style={{
              width: "100%",
              maxWidth: "100%",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <article
                className="order-card"
                key={i}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                <header
                  className="order-card-header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    className="order-meta"
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    <Skeleton variant="text" width="100px" height="20px" />
                    <Skeleton variant="text" width="130px" height="18px" />
                  </div>
                  <Skeleton
                    variant="text"
                    width="90px"
                    height="24px"
                    borderRadius="9999px"
                  />
                </header>

                <div className="order-items" style={{ marginTop: "16px" }}>
                  <Skeleton
                    variant="title"
                    width="140px"
                    height="20px"
                    style={{ marginBottom: "8px" }}
                  />
                  <Skeleton
                    variant="text"
                    width="220px"
                    height="16px"
                    style={{ marginBottom: "6px" }}
                  />
                  <Skeleton
                    variant="text"
                    width="260px"
                    height="16px"
                    style={{ marginBottom: "18px" }}
                  />

                  <Skeleton
                    variant="title"
                    width="70px"
                    height="20px"
                    style={{ marginBottom: "12px" }}
                  />
                  <div
                    className="order-item-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "100px minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: "16px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <Skeleton
                      variant="image"
                      width="100px"
                      height="100px"
                      borderRadius="10px"
                    />
                    <div>
                      <Skeleton
                        variant="text"
                        width="180px"
                        height="20px"
                        style={{ marginBottom: "8px" }}
                      />
                      <Skeleton variant="text" width="120px" height="16px" />
                    </div>
                    <Skeleton variant="text" width="80px" height="20px" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : error ? (
          <p
            role="alert"
            style={{
              textAlign: "center",
            }}
          >
            {error}
          </p>
        ) : orders.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No customer orders"
            description="New orders will appear here when customers check out."
          />
        ) : (
          <div
            className="orders-list"
            style={{
              width: "100%",
              maxWidth: "100%",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            {orders.map((order) => {
              const customerName = order.name || order.user.name;

              const customerEmail = order.email || order.user.email;

              return (
                <article
                  className="order-card"
                  key={order.id}
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <header className="order-card-header">
                    <div className="order-meta">
                      <span className="order-id">Order #{order.id}</span>

                      <span className="order-date">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <OrderStatusBadge status={order.status} />
                  </header>

                  <div className="order-items">
                    <h3>Customer details</h3>

                    <p>
                      <strong>{customerName}</strong> · {customerEmail}
                    </p>

                    <p>
                      {order.address || "No address provided"}

                      {order.city ? `, ${order.city}` : ""}

                      {order.pincode ? ` ${order.pincode}` : ""}
                    </p>

                    <h3
                      style={{
                        marginTop: "20px",
                      }}
                    >
                      Items
                    </h3>

                    {order.items.map((item) => (
                      <div
                        className="order-item-row"
                        key={item.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "100px minmax(0, 1fr) auto",
                          alignItems: "center",
                          gap: "16px",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          className="order-item-image"
                          style={{
                            width: "100px",
                            height: "100px",
                            minWidth: "100px",
                            overflow: "hidden",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--color-bg-subtle)",
                          }}
                        >
                          <Image
                            src={normalizeImageSrc(
                              item.product?.image ||
                                item.productImage ||
                                FALLBACK_IMAGE
                            )}
                            alt={
                              item.product?.name ||
                              item.productName ||
                              "Product"
                            }
                            width={48}
                            height={48}
                            unoptimized
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              display: "block",
                            }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                FALLBACK_IMAGE;
                            }}
                          />
                        </div>

                        <div
                          className="order-item-info"
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                            }}
                          >
                            {item.product?.name ||
                              item.productName ||
                              "Product Unavailable"}
                          </h4>

                          <span className="order-item-qty">
                            Qty: {item.quantity}
                          </span>
                        </div>

                        <span
                          className="order-item-price"
                          style={{
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <footer className="order-card-footer">
                    <span className="order-total-label">Order total</span>

                    <span className="order-total-value">
                      {formatPrice(order.total)}
                    </span>
                  </footer>

                  <div
                    className="order-items"
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      alignItems: "flex-end",
                    }}
                  >
                    <div style={{ flex: "1 1 220px" }}>
                      <Dropdown
                        label="Update status"
                        value={order.status}
                        disabled={busyOrderId === order.id}
                        options={ADMIN_ORDER_STATUSES.map((status) => ({
                          label: status,
                          value: status,
                        }))}
                        onChange={(val) =>
                          void updateStatus(
                            order.id,
                            val as AdminOrder["status"],
                          )
                        }
                      />
                    </div>

                    <Button
                      variant="danger"
                      disabled={busyOrderId === order.id}
                      onClick={() => void deleteOrder(order.id)}
                    >
                      Delete order
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
