import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const frontendRoot = path.resolve(__dirname, '..');

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/** The AI provider lives only in the NestJS backend; the browser talks to our /chat namespace. */
describe('AI secret isolation', () => {
  const sourceFiles = listFiles(path.join(frontendRoot, 'src')).filter(
    (file) =>
      /\.(ts|tsx|js|jsx|css|html)$/.test(file) &&
      !/\.spec\.tsx?$/.test(file) &&
      !file.split(path.sep).includes('tests'),
  );
  const configFiles = ['index.html', 'vite.config.ts', '.env.example'].map((file) =>
    path.join(frontendRoot, file),
  );

  it.each([
    ['DeepSeek references', /deepseek/i],
    ['AI provider env vars', /(VITE_[A-Z_]*(AI|DEEPSEEK|OPENAI)[A-Z_]*|AI_PROVIDER)/],
    ['provider API keys', /\bsk-[A-Za-z0-9]{16,}/],
  ])('frontend source contains no %s', (_label, pattern) => {
    const offenders = [...sourceFiles, ...configFiles].filter((file) =>
      pattern.test(readFileSync(file, 'utf8')),
    );
    expect(offenders.map((file) => path.relative(frontendRoot, file))).toEqual([]);
  });
});
