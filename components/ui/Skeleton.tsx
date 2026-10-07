"use client";

import React from "react";

export type SkeletonVariant =
  | "text"
  | "title"
  | "image"
  | "button"
  | "circle"
  | "card";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({
  variant = "text",
  width,
  height,
  borderRadius,
  animate = true,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  const inlineStyles: React.CSSProperties = {
    ...style,
  };

  if (width !== undefined) {
    inlineStyles.width = typeof width === "number" ? `${width}px` : width;
  }

  if (height !== undefined) {
    inlineStyles.height = typeof height === "number" ? `${height}px` : height;
  }

  if (borderRadius !== undefined) {
    inlineStyles.borderRadius =
      typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius;
  }

  return (
    <div
      aria-hidden="true"
      className={`skeleton skeleton-${variant} ${animate ? "skeleton-animated" : ""} ${className}`.trim()}
      style={inlineStyles}
      {...props}
    />
  );
}
