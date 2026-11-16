export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_KEY = 'compro-theme';

export function getStoredTheme(): ThemeChoice {
    try {
        const value = window.localStorage.getItem(THEME_KEY);
        if (value === 'light' || value === 'dark' || value === 'system') return value;
    } catch {
        // stockage indisponible
    }
    return 'light';
}

export function applyTheme(choice: ThemeChoice): void {
    const dark =
        choice === 'dark' ||
        (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
}

export function saveTheme(choice: ThemeChoice): void {
    try {
        window.localStorage.setItem(THEME_KEY, choice);
    } catch {
        // stockage indisponible
    }
    applyTheme(choice);
}
