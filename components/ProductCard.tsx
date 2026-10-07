"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  normalizeImageSrc,
  calculateFinalPrice,
  formatPrice,
  isOutOfStock,
  FALLBACK_IMAGE,
} from "@/lib/utils";
import { addToCart } from "@/hooks/useCart";
import WishlistButton from "./WishlistButton";
import type { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
  adminMode?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: number) => void;
  entranceIndex?: number;
  isEntranceActive?: boolean;
};

export default function ProductCard({
  product,
  adminMode = false,
  onEdit,
  onDelete,
  entranceIndex,
  isEntranceActive = false,
}: ProductCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const imageSrc = imageError
    ? FALLBACK_IMAGE
    : normalizeImageSrc(product.image);

  const finalPrice = calculateFinalPrice(product.price, product.discount);

  const outOfStock = isOutOfStock(product.stock);

  const isAnimatedEntrance =
    !adminMode && entranceIndex !== undefined && isEntranceActive;

  const isHero = entranceIndex === 0;
  const imageDelay = isHero ? 0 : (entranceIndex || 0) * 90 + 70;
  const cardDelay = isHero ? 120 : (entranceIndex || 0) * 90 + 140;
  const bodyDelay = isHero ? 320 : (entranceIndex || 0) * 90 + 240;

  const cardMotionClass = isAnimatedEntrance
    ? `cinematic-card-active ${
        isHero ? "cinematic-card-hero" : "cinematic-card-stagger"
      }`
    : "";

  const imageMotionClass = isAnimatedEntrance
    ? `cinematic-image-active ${
        isHero
          ? "cinematic-image-hero"
          : (entranceIndex || 0) % 2 === 0
          ? "cinematic-image-even"
          : "cinematic-image-odd"
      }`
    : "";

  const bodyMotionClass = isAnimatedEntrance ? "cinematic-body-active" : "";

  function openProductDetails() {
    if (!adminMode) {
      router.push(`/products/${product.id}`);
    }
  }

  function handleAddToCart() {
    const user = localStorage.getItem("user");

    if (!user) {
      showToast(
        "error",
        "Login Required",
        "Please login to add items to cart.",
      );

      router.push("/login");
      return;
    }

    if (outOfStock) return;

    addToCart(product);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1200);
  }

  return (
    <div
      className={`product-card card-interactive ${
        adminMode ? "admin-product-card" : ""
      } ${cardMotionClass}`.trim()}
      style={
        isAnimatedEntrance
          ? ({
              "--card-entrance-delay": `${cardDelay}ms`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className={`product-card-image ${
          isAnimatedEntrance ? "cinematic-image-container-active" : ""
        }`}
        onClick={openProductDetails}
        style={{
          cursor: adminMode ? "default" : "pointer",
        }}
      >
        <div
          className={`cinematic-motion-wrap ${imageMotionClass}`}
          style={
            isAnimatedEntrance
              ? ({
                  "--img-entrance-delay": `${imageDelay}ms`,
                } as React.CSSProperties)
              : undefined
          }
        >
          <Image
            src={imageSrc}
            alt={product.name}
            width={400}
            height={300}
            unoptimized
            onError={() => setImageError(true)}
          />
        </div>

        {adminMode && onEdit && (
          <button
            type="button"
            className="admin-edit-icon-btn"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(product);
            }}
            title="Edit product"
            aria-label={`Edit ${product.name}`}
          >
            ✏️
          </button>
        )}

        {!adminMode && (
          <div onClick={(event) => event.stopPropagation()}>
            <WishlistButton productId={product.id} />
          </div>
        )}

        {!adminMode && (
          <Badge
            variant="dark"
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
            }}
          >
            {product.category}
          </Badge>
        )}
      </div>

      <div
        className={`product-card-body ${bodyMotionClass}`}
        style={
          isAnimatedEntrance
            ? ({
                "--body-entrance-delay": `${bodyDelay}ms`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <h3
          onClick={openProductDetails}
          style={{
            cursor: adminMode ? "default" : "pointer",
          }}
        >
          {product.name}
        </h3>

        {!adminMode && product.averageRating !== undefined && product.averageRating > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "-4px",
              marginBottom: "8px",
              fontSize: "13px",
              color: "var(--color-text-secondary)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                background: "var(--color-primary-50, #f5f3ff)",
                color: "var(--color-primary-700, #4338ca)",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              ★ {product.averageRating.toFixed(1)}
            </span>
            {product.reviewCount !== undefined && (
              <span>({product.reviewCount})</span>
            )}
          </div>
        )}

        {adminMode ? (
          <div className="card-content">
            <p>Price: {formatPrice(product.price)}</p>
            <p>Discount: {product.discount}%</p>
            <p>Category: {product.category}</p>
            <p>Stock: {product.stock}</p>

            {outOfStock && (
              <Badge variant="dark">Out of Stock</Badge>
            )}
          </div>
        ) : (
          <div className="product-card-footer">
            <div className="price-display">
              <span className="price-current">{formatPrice(finalPrice)}</span>

              {product.discount > 0 && (
                <>
                  <span className="price-original">
                    {formatPrice(product.price)}
                  </span>

                  <span className="price-discount">
                    {product.discount}% OFF
                  </span>
                </>
              )}
            </div>

            {outOfStock ? (
              <Button variant="secondary" fullWidth disabled>
                Out of Stock
              </Button>
            ) : (
              <Button
                variant={isAdded ? "secondary" : "primary"}
                className={isAdded ? "animate-button-pop" : ""}
                fullWidth
                onClick={handleAddToCart}
              >
                {isAdded ? "✓ Added" : "Add to Cart"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
