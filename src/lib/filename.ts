/**
 * Sanitize a user-supplied scenario name into a safe filename stem.
 * Drops anything that isn't alphanumeric, whitespace, or hyphen, then
 * collapses runs of whitespace to single underscores.
 */
export function safeFileName(name: string): string {
  return (
    name
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'scenario'
  );
}
