export async function delay(timestamp: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timestamp);
  });
}
