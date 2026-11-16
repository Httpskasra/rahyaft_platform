"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useInfiniteRows<T>(rows: T[], batchSize = 20) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const hasMore = visibleCount < rows.length;

  const loadMore = useCallback(() => {
    setVisibleCount((count) => Math.min(count + batchSize, rows.length));
  }, [batchSize, rows.length]);

  const reset = useCallback(() => setVisibleCount(batchSize), [batchSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return { visibleRows, hasMore, loadMore, reset, sentinelRef };
}
