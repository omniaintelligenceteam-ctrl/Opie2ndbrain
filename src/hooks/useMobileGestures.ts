'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeGestures(
  ref: React.RefObject<HTMLElement>,
  options: SwipeGestureOptions
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    enabled = true,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Check if swipe exceeded threshold
      if (absX < threshold && absY < threshold) {
        touchStartRef.current = null;
        return;
      }

      // Horizontal swipe
      if (absX > absY) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      // Vertical swipe
      else {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }

      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);
}

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh(
  ref: React.RefObject<HTMLElement>,
  options: PullToRefreshOptions
) {
  const { onRefresh, threshold = 80, enabled = true } = options;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of scroll
      if (element.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null || isRefreshing) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      if (distance > 0 && element.scrollTop === 0) {
        // Prevent default only when pulling down at top
        e.preventDefault();
        // Apply resistance
        setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
      touchStartY.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, enabled, threshold, isRefreshing, pullDistance, handleRefresh]);

  return { isRefreshing, pullDistance };
}

// Bottom Navigation component helper
export function useBottomNav() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      const currentY = window.scrollY;
      
      // Hide on scroll down, show on scroll up
      if (currentY > lastScrollY.current && currentY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isVisible;
}
