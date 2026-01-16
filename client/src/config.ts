export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '',
} as const

export function apiPath(path: string): string {
  return `${config.apiUrl}${path}`
}
