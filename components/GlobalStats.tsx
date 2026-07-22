import { formatAmount } from '@/lib/format';

export default function GlobalStats({
  totalRaised,
  campaignCount,
  isLive,
}: {
  totalRaised: number | null;
  campaignCount: number | null;
  isLive: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-line bg-panel p-4">
        <span className="text-xs uppercase tracking-widest text-mute">Total raised</span>
        <p className="mt-1 font-display text-2xl text-ink">{totalRaised !== null ? formatAmount(totalRaised) : '—'}</p>
        <span className="text-xs text-mute">across all campaigns (Registry contract)</span>
      </div>
      <div className="rounded-2xl border border-line bg-panel p-4">
        <span className="text-xs uppercase tracking-widest text-mute">Campaigns</span>
        <p className="mt-1 font-display text-2xl text-ink">{campaignCount ?? '—'}</p>
        <span className="text-xs text-mute">created so far</span>
      </div>
      <div className="col-span-2 flex items-center gap-2 rounded-2xl border border-line bg-panel p-4 sm:col-span-1">
        <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-lumen' : 'bg-mute'}`} />
        <span className="text-xs text-mute">{isLive ? 'Live event sync active' : 'Event sync idle'}</span>
      </div>
    </div>
  );
}
