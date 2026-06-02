import { useState, useRef, useEffect } from "react";

export function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(null);
  const THRESHOLD = 72;

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null) return;
      const dist = e.touches[0].clientY - startY.current;
      if (dist > 0) setPullDistance(Math.min(dist, THRESHOLD * 1.4));
    };

    const onTouchEnd = async () => {
      if (pullDistance >= THRESHOLD && !refreshing) {
        setPullDistance(0);
        startY.current = null;
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
      } else {
        setPullDistance(0);
        startY.current = null;
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(1, pullDistance / THRESHOLD);
  const visible = refreshing || pullDistance > 8;

  const indicator = visible ? (
    <div
      style={{
        transform: `translateY(${refreshing ? 0 : pullDistance - THRESHOLD}px)`,
        opacity: refreshing ? 1 : progress,
      }}
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-150"
    >
      <div className="w-8 h-8 rounded-full bg-card border border-border shadow-lg flex items-center justify-center">
        <div
          className={`w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full ${refreshing ? "animate-spin" : ""}`}
          style={!refreshing ? { transform: `rotate(${progress * 270}deg)` } : {}}
        />
      </div>
    </div>
  ) : null;

  return { refreshing, pullDistance, indicator };
}