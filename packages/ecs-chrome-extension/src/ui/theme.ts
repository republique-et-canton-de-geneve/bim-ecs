export type Theme = 'dark' | 'light';

/** Follows the DevTools theme when running as an extension, the system theme otherwise */
export function detectTheme(): Theme {
  try {
    const devtoolsTheme = globalThis.chrome?.devtools?.panels?.themeName;
    if (devtoolsTheme) return devtoolsTheme === 'dark' ? 'dark' : 'light';
  } catch {
    // Not running in a devtools page
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
