import { Banner } from "../Banner";

export function LoadingState({ label = "Loading…" }) {
  return <div className="inline-boot">{label}</div>;
}

export function ErrorState({ error, onRetry, label = "Retry" }) {
  if (!error) return null;
  return (
    <div className="state-block">
      <Banner>{error}</Banner>
      <button type="button" onClick={onRetry}>
        {label}
      </button>
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="empty state-block">{children}</div>;
}
