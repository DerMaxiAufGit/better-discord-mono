import { useState, useEffect } from 'react';

/**
 * Hook that returns the visual viewport height, accounting for mobile keyboard.
 * Falls back to window.innerHeight if visualViewport API is not available.
 */
export function useVisualViewport() {
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined'
      ? (window.visualViewport?.height ?? window.innerHeight)
      : 0
  );

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      // Fallback for browsers without visualViewport
      const handleResize = () => setHeight(window.innerHeight);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const handleResize = () => {
      setHeight(viewport.height);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    // Set initial value
    setHeight(viewport.height);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return height;
}
