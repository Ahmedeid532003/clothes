import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

type Props = {
  children: React.ReactElement;
  className?: string;
  minHeight?: number | string;
};

/** Recharts needs a parent with real pixel dimensions — avoids width/height -1 warnings. */
export function ErpChartContainer({ children, className = '', minHeight = 200 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`min-w-0 w-full ${className}`.trim()}
      style={{ minHeight, height: typeof minHeight === 'number' ? minHeight : undefined }}
    >
      {size.width > 0 && size.height > 0 ? (
        <ResponsiveContainer width={size.width} height={size.height}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
