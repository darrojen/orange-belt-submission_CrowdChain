import { ERROR_LABELS } from '@/lib/errors';
import type { AppError } from '@/types/campaign';

export default function ErrorBanner({ error, onDismiss }: { error: AppError; onDismiss: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-signal/50 bg-signal/5 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-signal">{ERROR_LABELS[error.kind]}</p>
        <p className="mt-1 text-sm text-ink">{error.message}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-xs text-mute hover:text-ink" aria-label="Dismiss error">
        ✕
      </button>
    </div>
  );
}
