import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import api from '../services/api';

const DHAKA_CENTER = [23.8103, 90.4125];

function levelColor(level) {
  const s = String(level ?? '').toUpperCase();
  if (s === 'HIGH') return '#ef4444';
  if (s === 'MEDIUM') return '#eab308';
  return '#22c55e';
}

function CongestionMap() {
  const [hour, setHour] = useState(() => new Date().getHours());
  const [features, setFeatures] = useState([]);
  const [meta, setMeta] = useState({ hour: null, dow: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('/congestion/map', { params: { hour } });
      setFeatures(Array.isArray(data?.features) ? data.features : []);
      setMeta({ hour: data?.hour, dow: data?.dow });
    } catch (err) {
      const msg =
        err.response?.data?.message ?? err.message ?? 'Failed to load congestion map';
      setError(typeof msg === 'string' ? msg : String(msg));
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, [hour]);

  useEffect(() => {
    load();
  }, [load]);

  const lines = useMemo(
    () =>
      features.map((f) => ({
        key: f.segment_key,
        positions: [
          [f.from.lat, f.from.lon],
          [f.to.lat, f.to.lon],
        ],
        color: levelColor(f.level),
        label: `${f.route}: ${f.from.name} → ${f.to.name} (${f.level})`,
      })),
    [features],
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden px-6 py-24 md:px-12 md:py-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Congestion map</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Segment colors reflect the trained congestion model for the selected hour (green /
            yellow / red). Data is derived from route segments and approximate stop coordinates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            Hour (0–23)
            <input
              type="range"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="w-40 accent-cyan-400"
            />
            <span className="font-mono text-white">{hour}</span>
          </label>
          <span className="text-xs text-slate-500">
            Model hour {meta.hour ?? '—'} · refresh on release
          </span>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="h-[min(70vh,560px)] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              Loading map…
            </div>
          ) : (
            <MapContainer
              center={DHAKA_CENTER}
              zoom={12}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {lines.map((line) => (
                <Polyline
                  key={line.key}
                  positions={line.positions}
                  pathOptions={{ color: line.color, weight: 5, opacity: 0.85 }}
                >
                  <Tooltip sticky>{line.label}</Tooltip>
                </Polyline>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-6 rounded" style={{ background: '#22c55e' }} />
            LOW
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-6 rounded" style={{ background: '#eab308' }} />
            MEDIUM
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-6 rounded" style={{ background: '#ef4444' }} />
            HIGH
          </span>
        </div>
      </div>
    </div>
  );
}

export default CongestionMap;
