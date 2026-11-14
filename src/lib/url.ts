/** Returns the URL only when it is an absolute http(s) URL; blocks javascript:, data:, etc. */
export function safeHttpUrl(url: string | undefined | null): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}
