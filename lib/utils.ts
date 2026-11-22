import { clsx, type ClassValue } from "clsx";

/**
 * Merges class names, filtering falsy values.
 * Thin wrapper around clsx — kept here so imports stay at `@/lib/utils`.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
