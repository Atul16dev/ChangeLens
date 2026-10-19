import React, { useEffect, useRef, useState } from 'react';

/**
 * Custom React hook to detect when an element scrolls into the viewport.
 */
export function useInView(options = {}) {
  const { threshold = 0.15, rootMargin = '0px 0px -50px 0px', once = true } = options;
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.unobserve(node);
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isInView];
}

/**
 * ScrollReveal wrapper component for animated scroll-triggered reveals.
 */
export function ScrollReveal({
  children,
  className = '',
  animation = 'fade-up', // 'fade-up' | 'fade-down' | 'fade-in' | 'scale-up' | 'slide-left' | 'slide-right'
  delay = 0,
  duration = 750,
  threshold = 0.12,
  rootMargin = '0px 0px -40px 0px',
  once = true,
  style = {},
  as: Component = 'div',
  ...props
}) {
  const [ref, isVisible] = useInView({ threshold, rootMargin, once });

  const getTransformClasses = () => {
    if (isVisible) {
      return 'opacity-100 translate-x-0 translate-y-0 scale-100';
    }

    switch (animation) {
      case 'fade-up':
        return 'opacity-0 translate-y-9 scale-[0.99]';
      case 'fade-down':
        return 'opacity-0 -translate-y-8';
      case 'fade-in':
        return 'opacity-0';
      case 'scale-up':
        return 'opacity-0 scale-[0.93] translate-y-4';
      case 'slide-left':
        return 'opacity-0 translate-x-12';
      case 'slide-right':
        return 'opacity-0 -translate-x-12';
      default:
        return 'opacity-0 translate-y-8';
    }
  };

  return (
    <Component
      ref={ref}
      className={`transition-all ${getTransformClasses()} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform, opacity',
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
