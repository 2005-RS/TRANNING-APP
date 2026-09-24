export function readCssColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function chartColors() {
  return {
    line: readCssColor('--chart-1', '#60a5fa'),
    grid: readCssColor('--border', '#2a2a2e'),
    tick: readCssColor('--muted-foreground', '#a1a1aa'),
    tooltipBg: readCssColor('--card', '#161618'),
    tooltipFg: readCssColor('--foreground', '#f4f4f5'),
    tooltipBorder: readCssColor('--border', '#2a2a2e'),
  };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
