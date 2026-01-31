'use client';
import React, { useCallback, useRef, useState } from 'react';

interface TiltState {
  rotateX: number;
  rotateY: number;
  scale: number;
  glareX: number;
  glareY: number;
  isHovering: boolean;
}

interface UseMouseTiltOptions {
  maxTilt?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
}

export function useMouseTilt(options: UseMouseTiltOptions = {}) {
  const {
    maxTilt = 15,
    scale = 1.02,
    speed = 400,
    glare = true,
  } = options;

  const [tilt, setTilt] = useState<TiltState>({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    glareX: 50,
    glareY: 50,
    isHovering: false,
  });

  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / (rect.height / 2)) * -maxTilt;
    const rotateY = (mouseX / (rect.width / 2)) * maxTilt;

    // Glare position (percentage from top-left)
    const glareX = ((e.clientX - rect.left) / rect.width) * 100;
    const glareY = ((e.clientY - rect.top) / rect.height) * 100;

    setTilt({
      rotateX,
      rotateY,
      scale,
      glareX,
      glareY,
      isHovering: true,
    });
  }, [maxTilt, scale]);

  const handleMouseEnter = useCallback(() => {
    setTilt(prev => ({ ...prev, isHovering: true, scale }));
  }, [scale]);

  const handleMouseLeave = useCallback(() => {
    setTilt({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      glareX: 50,
      glareY: 50,
      isHovering: false,
    });
  }, []);

  const tiltStyle: React.CSSProperties = {
    transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
    transition: tilt.isHovering ? `transform ${speed * 0.5}ms ease-out` : `transform ${speed}ms ease-out`,
    transformStyle: 'preserve-3d',
  };

  const glareStyle: React.CSSProperties = glare ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
    opacity: tilt.isHovering ? 1 : 0,
    transition: `opacity ${speed}ms ease-out`,
    pointerEvents: 'none',
    zIndex: 10,
  } : {};

  // Holographic rainbow effect
  const holoStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 'inherit',
    background: `linear-gradient(
      ${45 + tilt.rotateY * 2}deg,
      transparent 0%,
      rgba(255, 0, 128, 0.03) 25%,
      rgba(0, 255, 255, 0.03) 50%,
      rgba(255, 255, 0, 0.03) 75%,
      transparent 100%
    )`,
    opacity: tilt.isHovering ? 1 : 0,
    transition: `opacity ${speed}ms ease-out`,
    pointerEvents: 'none',
    zIndex: 9,
  };

  return {
    ref: elementRef,
    tiltStyle,
    glareStyle,
    holoStyle,
    tilt,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

// Wrapper component for easy use
interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxTilt?: number;
  glare?: boolean;
  holo?: boolean;
  onClick?: () => void;
}

export function HolographicCard({
  children,
  className,
  style,
  maxTilt = 12,
  glare = true,
  holo = true,
  onClick,
}: HolographicCardProps) {
  const { ref, tiltStyle, glareStyle, holoStyle, handlers } = useMouseTilt({
    maxTilt,
    glare,
  });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        ...tiltStyle,
        position: 'relative',
      }}
      onClick={onClick}
      {...handlers}
    >
      {children}
      {glare && <div style={glareStyle} />}
      {holo && <div style={holoStyle} />}
    </div>
  );
}
