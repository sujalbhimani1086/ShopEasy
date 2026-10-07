"use client";

import React from "react";
import Skeleton from "./Skeleton";

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  headers?: string[];
  className?: string;
  style?: React.CSSProperties;
}

export default function TableSkeleton({
  columns = 5,
  rows = 5,
  headers,
  className = "",
  style,
}: TableSkeletonProps) {
  const colCount = headers ? headers.length : columns;

  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        overflowX: "auto",
        ...style,
      }}
      className={className}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "700px",
        }}
      >
        {headers && (
          <thead>
            <tr>
              {headers.map((title, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderBottom: "2px solid var(--color-border)",
                    color: "var(--color-text-secondary)",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              style={{
                borderBottom: "1px solid var(--color-border-light)",
              }}
            >
              {Array.from({ length: colCount }).map((_, colIndex) => (
                <td
                  key={colIndex}
                  style={{
                    padding: "16px",
                  }}
                >
                  <Skeleton
                    width={
                      colIndex === 0
                        ? "45%"
                        : colIndex === colCount - 1
                        ? "60%"
                        : `${55 + ((colIndex * 17) % 35)}%`
                    }
                    height={18}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
