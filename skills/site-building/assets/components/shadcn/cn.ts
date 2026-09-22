import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Local integration helper: keep class composition in one place.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
