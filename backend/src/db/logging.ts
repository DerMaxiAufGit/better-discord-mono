export function shouldLogQueryText(env: string | undefined): boolean {
  return env !== 'production';
}

export function buildQueryLog(
  text: string,
  duration: number,
  rows: number,
  env: string | undefined
): { text?: string; duration: number; rows: number } {
  if (shouldLogQueryText(env)) {
    return { text, duration, rows };
  }
  return { duration, rows };
}

export function buildQueryErrorLog(
  text: string,
  error: unknown,
  env: string | undefined
): { text?: string; error: unknown } {
  if (shouldLogQueryText(env)) {
    return { text, error };
  }
  return { error };
}
