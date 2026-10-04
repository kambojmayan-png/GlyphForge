
export function LiveRegion({
  politeMessage,
  assertiveMessage,
}: {
  politeMessage?: string;
  assertiveMessage?: string;
}) {
  return (
    <div className="sr-only" aria-atomic="true">
      <div role="status" aria-live="polite">
        {politeMessage}
      </div>
      <div role="alert" aria-live="assertive">
        {assertiveMessage}
      </div>
    </div>
  );
}
