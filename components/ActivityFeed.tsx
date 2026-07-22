import { shortenAddress, formatAmount } from '@/lib/format';
import type { ContributionEvent } from '@/types/campaign';

export default function ActivityFeed({ events }: { events: ContributionEvent[] }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <span className="text-xs uppercase tracking-widest text-mute">Activity</span>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-mute">No contributions yet. Events stream here as they land on-chain.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {events
            .slice()
            .reverse()
            .slice(0, 10)
            .map((event, i) => (
              <li
                key={`${event.contributor}-${event.ledger}-${i}`}
                className="flex flex-col gap-0.5 border-b border-line/60 pb-2 text-xs last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-mono text-mute">{shortenAddress(event.contributor)}</span>
                <span className="text-ink">
                  gave {formatAmount(event.amount)} to campaign #{event.campaignId}
                </span>
                <span className="font-mono text-mute">ledger {event.ledger}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
