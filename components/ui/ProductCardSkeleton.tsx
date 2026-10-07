"use client";

import React from "react";
import Skeleton from "./Skeleton";

export interface ProductCardSkeletonProps {
  adminMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ProductCardSkeleton({
  adminMode = false,
  className = "",
  style,
}: ProductCardSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`product-card ${adminMode ? "admin-product-card" : ""} ${className}`.trim()}
      style={style}
    >
      {/* Product Image Area */}
      <div className="product-card-image" style={{ position: "relative" }}>
        <Skeleton variant="image" width="100%" height="100%" />

        {!adminMode && (
          <>
            {/* Category Badge Skeleton */}
            <Skeleton
              width={72}
              height={24}
              borderRadius={999}
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                zIndex: 2,
              }}
            />

            {/* Wishlist Button Skeleton */}
            <Skeleton
              variant="circle"
              width={40}
              height={40}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                zIndex: 2,
              }}
            />
          </>
        )}
      </div>

      {/* Product Body Area */}
      <div className="product-card-body">
        {/* Product Name */}
        <Skeleton
          variant="title"
          width="80%"
          height={20}
          style={{ marginBottom: "12px" }}
        />

        {adminMode ? (
          <div className="card-content">
            <Skeleton width="55%" height={15} style={{ marginBottom: "8px" }} />
            <Skeleton width="45%" height={15} style={{ marginBottom: "8px" }} />
            <Skeleton width="65%" height={15} style={{ marginBottom: "8px" }} />
            <Skeleton width="40%" height={15} style={{ marginBottom: "12px" }} />

            {/* Delete button skeleton */}
            <Skeleton
              variant="button"
              width="100%"
              height={34}
              style={{ marginTop: "8px" }}
            />
          </div>
        ) : (
          <div className="product-card-footer">
            {/* Price Display */}
            <div
              className="price-display"
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <Skeleton width={80} height={24} />
              <Skeleton width={48} height={16} />
            </div>

            {/* Add to Cart Button */}
            <Skeleton
              variant="button"
              width="100%"
              height={42}
              style={{ marginTop: "12px" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
