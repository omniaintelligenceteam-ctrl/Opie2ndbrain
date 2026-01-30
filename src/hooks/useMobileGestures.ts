'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ================== SWIPE GESTURES ==================

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

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Check velocity (must be fast enough) and distance
      const velocity = Math.max(absX, absY) / deltaTime;
      if ((absX < threshold && absY < threshold) || velocity < 0.3) {
        touchStartRef.current = null;
        return;
      }

      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
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

// ================== PULL TO REFRESH ==================

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
  const isPulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20]);
    }
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
      if (element.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null || isRefreshing || !isPulling.current) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      if (distance > 0 && element.scrollTop <= 0) {
        e.preventDefault();
        // Apply resistance curve for natural feel
        const resistance = 0.5 - (distance / (threshold * 6));
        const resistedDistance = distance * Math.max(0.2, resistance);
        setPullDistance(Math.min(resistedDistance, threshold * 1.5));
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
      touchStartY.current = null;
      isPulling.current = false;
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

  return { isRefreshing, pullDistance, threshold };
}

// ================== BOTTOM NAV VISIBILITY ==================

export function useBottomNav() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const delta = currentY - lastScrollY.current;
          
          // Calculate velocity
          scrollVelocity.current = delta;
          
          // Hide on scroll down (fast), show on scroll up or at top
          if (currentY <= 50) {
            setIsVisible(true);
          } else if (delta > 5 && currentY > 100) {
            setIsVisible(false);
          } else if (delta < -3) {
            setIsVisible(true);
          }
          
          lastScrollY.current = currentY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isVisible;
}

// ================== RESPONSIVE BREAKPOINTS ==================

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    breakpoint: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let breakpoint: Breakpoint;
      if (width < 640) {
        breakpoint = 'mobile';
      } else if (width < 1024) {
        breakpoint = 'tablet';
      } else {
        breakpoint = 'desktop';
      }

      setState({
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        width,
        height,
      });
    };

    updateBreakpoint();
    
    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
}

// ================== HAPTIC FEEDBACK ==================

type HapticIntensity = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error';

export function useHaptic() {
  const triggerHaptic = useCallback((intensity: HapticIntensity = 'light') => {
    if (!('vibrate' in navigator)) return;

    const patterns: Record<HapticIntensity, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      selection: 15,
      success: [10, 30, 10],
      error: [50, 30, 50],
    };

    navigator.vibrate(patterns[intensity]);
  }, []);

  return { triggerHaptic };
}

// ================== LONG PRESS ==================

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      if ('vibrate' in navigator) navigator.vibrate(25);
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current && onClick) {
      onClick();
    }
  }, [onClick]);

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onClick: handleClick,
  };
}

// ================== SAFE AREA INSETS ==================

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const computeInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('--sat') || '0', 10),
        right: parseInt(style.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
        left: parseInt(style.getPropertyValue('--sal') || '0', 10),
      });
    };

    // Set CSS custom properties for safe area
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');

    // Initial computation
    setTimeout(computeInsets, 100);

    // Update on resize (orientation change)
    window.addEventListener('resize', computeInsets);
    return () => window.removeEventListener('resize', computeInsets);
  }, []);

  return insets;
}

// ================== TOUCH TARGET SIZE ==================

// Ensures minimum touch target size of 44px
export function touchTargetStyle(
  size: 'small' | 'medium' | 'large' = 'medium'
): React.CSSProperties {
  const sizes = {
    small: '44px',
    medium: '48px',
    large: '56px',
  };

  return {
    minWidth: sizes[size],
    minHeight: sizes[size],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  };
}

// ================== SCROLL LOCK ==================

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (locked) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [locked]);
}

// ================== LAZY LOAD VISIBILITY ==================

export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (visible && !hasLoaded) {
          setHasLoaded(true);
        }
      },
      {
        rootMargin: '100px',
        threshold: 0,
        ...options,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options, hasLoaded]);

  return { isVisible, hasLoaded };
}

// ================== ANIMATION PERFORMANCE ==================

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
