import { useEffect, useState, useCallback } from 'react';
import {
  loadTokens, beginOAuth, disconnect, listActivities,
  type StravaTokens, type StravaActivitySummary,
} from '../strava';

type Props = { onShowToast: (msg: string) => void };

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(meters: number): string {
  if (meters <= 0) return '';
  const mi = meters / 1609.344;
  return `${mi.toFixed(2)} mi`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StravaSection({ onShowToast }: Props) {
  const [tokens, setTokens] = useState<StravaTokens | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [activities, setActivities] = useState<StravaActivitySummary[] | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTokens().then(t => {
      setTokens(t);
      setLoadingTokens(false);
    });
  }, []);

  const refreshActivities = useCallback(async () => {
    setLoadingActivities(true);
    setError(null);
    try {
      const list = await listActivities(30);
      setActivities(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    if (tokens) refreshActivities();
  }, [tokens, refreshActivities]);

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Strava? You can reconnect anytime.')) return;
    await disconnect();
    setTokens(null);
    setActivities(null);
    onShowToast('Strava disconnected');
  };

  if (loadingTokens) {
    return <div className="card p-4 text-sm text-vapor-muted">Loading…</div>;
  }

  if (!tokens) {
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <p className="text-sm font-semibold text-vapor-pink mb-2">Connect Strava</p>
          <p className="text-xs text-vapor-muted mb-3">
            Push completed workouts to Strava and pull recent activities. Read + write access.
          </p>
          <button
            onClick={beginOAuth}
            className="block mx-auto"
            aria-label="Connect with Strava"
          >
            <img
              src={`${import.meta.env.BASE_URL}strava/btn_strava_connect_with_orange.svg`}
              alt="Connect with Strava"
              className="h-12"
            />
          </button>
        </div>
      </div>
    );
  }

  const athlete = tokens.athlete;
  const name = [athlete?.firstname, athlete?.lastname].filter(Boolean).join(' ') || athlete?.username || `Athlete #${athlete?.id ?? '?'}`;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-3">
          {athlete?.profile && (
            <img src={athlete.profile} alt="" className="h-10 w-10 rounded-full" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-vapor-pink truncate">{name}</p>
            <p className="text-xs text-vapor-muted">Connected to Strava</p>
          </div>
          <button
            onClick={handleDisconnect}
            className="rounded-lg bg-vapor-navy px-3 py-1.5 text-xs font-semibold text-vapor-light hover:bg-zinc-700"
          >
            Disconnect
          </button>
        </div>
        {tokens.scope && (
          <p className="mt-2 text-[10px] text-vapor-muted/80 break-all">scope: {tokens.scope}</p>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-vapor-pink">Recent Activities</p>
          <button
            onClick={refreshActivities}
            disabled={loadingActivities}
            className="text-xs font-semibold text-vapor-cyan disabled:text-zinc-600"
          >
            {loadingActivities ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {error && <p className="text-xs text-vapor-red mb-2">{error}</p>}
        {!activities || activities.length === 0 ? (
          <p className="text-xs text-vapor-muted">{loadingActivities ? '' : 'No activities yet.'}</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {activities.map(a => (
              <li key={a.id} className="py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.name}</p>
                  <p className="text-[11px] text-vapor-muted">
                    {formatDate(a.start_date_local)} · {a.sport_type} · {formatDuration(a.elapsed_time)}
                    {a.distance > 0 && ` · ${formatDistance(a.distance)}`}
                  </p>
                </div>
                <a
                  href={`https://www.strava.com/activities/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-[#fc4c02]"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
