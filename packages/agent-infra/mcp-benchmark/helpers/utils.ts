export function waitForReady(
  check: () => boolean,
  interval = 500,
): Promise<void> {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (check()) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}
