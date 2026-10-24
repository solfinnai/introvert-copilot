/** Replace em and en dashes so scraped bios can be shown in the UI. */
export function sanitizeCopy(input: string): string {
  return input
    .replace(/(\d)\s*\u2013\s*(\d)/g, "$1 to $2")
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function plainText(html: string): string {
  return sanitizeCopy(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " "),
  );
}
