'use client';
import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  targetAlpha: number;
}

interface ParticleBackgroundProps {
  particleCount?: number;
  colors?: string[];
  intensity?: 'low' | 'medium' | 'high';
  mouseAttraction?: boolean;
  className?: string;
}

const AGENT_COLORS = [
  'rgba(102, 126, 234, 0.6)',  // Primary purple
  'rgba(118, 75, 162, 0.5)',   // Deep purple
  'rgba(59, 130, 246, 0.5)',   // Blue
  'rgba(34, 197, 94, 0.4)',    // Green
  'rgba(139, 92, 246, 0.5)',   // Violet
  'rgba(34, 211, 238, 0.4)',   // Cyan
];

export default function ParticleBackground({
  particleCount = 60,
  colors = AGENT_COLORS,
  intensity = 'medium',
  mouseAttraction = true,
  className,
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);
  const intensityMultiplier = intensity === 'low' ? 0.5 : intensity === 'high' ? 1.5 : 1;

  const createParticle = useCallback((width: number, height: number): Particle => {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3 * intensityMultiplier,
      vy: (Math.random() - 0.5) * 0.3 * intensityMultiplier,
      size: Math.random() * 2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.1,
      targetAlpha: Math.random() * 0.5 + 0.1,
    };
  }, [colors, intensityMultiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize particles
    const { width, height } = canvas.getBoundingClientRect();
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(width, height)
    );

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    if (mouseAttraction) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      particlesRef.current.forEach((particle) => {
        // Mouse attraction
        if (mouseAttraction && mouseRef.current.x > 0) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const force = (150 - dist) / 150 * 0.02;
            particle.vx += dx * force * 0.1;
            particle.vy += dy * force * 0.1;
          }
        }

        // Add subtle floating motion
        particle.vx += (Math.random() - 0.5) * 0.01;
        particle.vy += (Math.random() - 0.5) * 0.01;

        // Apply velocity with damping
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = rect.width;
        if (particle.x > rect.width) particle.x = 0;
        if (particle.y < 0) particle.y = rect.height;
        if (particle.y > rect.height) particle.y = 0;

        // Fade alpha towards target
        particle.alpha += (particle.targetAlpha - particle.alpha) * 0.02;

        // Occasionally change target alpha for twinkling
        if (Math.random() < 0.005) {
          particle.targetAlpha = Math.random() * 0.5 + 0.1;
        }

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

        // Glow effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        );
        gradient.addColorStop(0, particle.color.replace(/[\d.]+\)$/, `${particle.alpha})`));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${particle.alpha * 1.5})`);
        ctx.fill();
      });

      // Draw connections between nearby particles
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(102, 126, 234, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mouseAttraction) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationRef.current);
    };
  }, [particleCount, colors, mouseAttraction, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: mouseAttraction ? 'auto' : 'none',
        zIndex: 0,
      }}
    />
  );
}
