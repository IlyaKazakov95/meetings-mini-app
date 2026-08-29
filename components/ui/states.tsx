export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-3xl bg-card px-5 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {text ? <p className="mt-2 text-sm text-muted">{text}</p> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl bg-card px-5 py-8 text-center">
      <h2 className="text-lg font-semibold text-danger">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}
