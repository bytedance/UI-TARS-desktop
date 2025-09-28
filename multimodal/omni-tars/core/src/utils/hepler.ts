/**
 * Use the provided string parameter or fall back to process.env.AIO_SANDBOX_URL
 * @param str
 * @returns
 */
export function extractAioPort(str?: string): number {
  const url = str || process.env.AIO_SANDBOX_URL;

  if (!url) {
    return 8080;
  }

  try {
    const parsedUrl = new URL(url);
    const port = parsedUrl.port;

    if (port) {
      return parseInt(port, 10);
    }

    return 8080;
  } catch (error) {
    return 8080;
  }
}

export function getAioUrl() {
  return process.env.AIO_SANDBOX_URL || 'http://localhost:8080';
}

export function getTimeString() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
