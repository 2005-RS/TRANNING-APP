import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

/**
 * Fails on serious or critical WCAG 2.2 A/AA violations. Minor and moderate
 * findings are not gating; they are left to manual review.
 */
export async function expectNoSeriousA11yViolations(page: Page, label: string) {
  // Contrast is measured on the settled page. Mid-transition colors (a sheet
  // fading in, a theme switch) otherwise produce ratios no user ever sees.
  // Entry transitions start a frame after mount, so they are collected after
  // two frames rather than immediately.
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const blocking = results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 5).map((node) => ({
        target: node.target.join(' '),
        html: node.html.slice(0, 200),
        summary: node.failureSummary,
      })),
    }));

  expect(blocking, `${label}: serious or critical accessibility violations`).toEqual([]);
}
