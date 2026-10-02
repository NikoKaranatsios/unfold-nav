/** Default browser navigation allows web links and common contact protocols. Custom routers own their URLs. */
export function navigationUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    return ['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
