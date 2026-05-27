export type Theme = "light" | "dark";

export const themeCookieName = "valemuito-theme";
export const themeStorageKey = themeCookieName;

export function parseTheme(value: string | null | undefined): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}