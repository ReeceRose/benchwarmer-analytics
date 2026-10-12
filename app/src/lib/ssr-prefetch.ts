// Route loaders prime the Query cache. During SSR, wait for those prefetches
// (up to a limit) so the HTML already contains the data; whatever isn't ready
// renders its skeleton and loads in the browser. In the browser, don't wait:
// the page renders its skeletons while the queries run.
export async function prefetchForSsr(
  prefetches: Promise<unknown>[],
  timeoutMs = 1500,
): Promise<void> {
  if (typeof window !== "undefined") return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.allSettled(prefetches),
    new Promise((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);
  clearTimeout(timer);
}
