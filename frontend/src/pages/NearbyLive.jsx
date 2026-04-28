import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import { io } from 'socket.io-client';
import {
  getLiveBusLocations,
  getNearbyStops,
  getUpcomingBuses,
  searchStops,
} from '../services/api';

const DHAKA_CENTER = [23.8103, 90.4125];

function NearbyLive() {
  const [query, setQuery] = useState('');
  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [liveBuses, setLiveBuses] = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [loadingBuses, setLoadingBuses] = useState(false);
  const [error, setError] = useState('');
  const [socketMode, setSocketMode] = useState('connecting');

  const socketBaseUrl =
    (import.meta.env.VITE_SOCKET_URL && String(import.meta.env.VITE_SOCKET_URL).trim()) ||
    (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

  const loadLive = async () => {
    setLoadingBuses(true);
    try {
      const { data } = await getLiveBusLocations();
      setLiveBuses(Array.isArray(data?.buses) ? data.buses : []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load live buses';
      setError(String(msg));
    } finally {
      setLoadingBuses(false);
    }
  };

  useEffect(() => {
    let disconnected = false;
    const socket = io(socketBaseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 8000,
    });

    socket.on('connect', () => {
      if (disconnected) return;
      setSocketMode('live');
      socket.emit('live:subscribe');
    });

    socket.on('live:buses', (payload) => {
      if (disconnected) return;
      const list = Array.isArray(payload?.buses) ? payload.buses : [];
      setLiveBuses(list);
      setLoadingBuses(false);
      setError('');
    });

    socket.on('disconnect', () => {
      if (disconnected) return;
      setSocketMode('fallback');
    });

    socket.on('connect_error', () => {
      if (disconnected) return;
      setSocketMode('fallback');
    });

    // Fallback polling while socket is unavailable.
    const pollId = setInterval(() => {
      if (socket.connected) return;
      loadLive();
    }, 5000);

    // Initial fallback fetch so page has data immediately.
    loadLive();

    return () => {
      disconnected = true;
      clearInterval(pollId);
      socket.disconnect();
    };
  }, []);

  const onUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser');
      return;
    }
    setLoadingStops(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setError('');
          const { latitude, longitude } = pos.coords;
          const { data } = await getNearbyStops(latitude, longitude, 5);
          setStops(Array.isArray(data?.stops) ? data.stops : []);
        } catch (err) {
          const msg = err.response?.data?.error || err.message || 'Failed to load nearby stops';
          setError(String(msg));
        } finally {
          setLoadingStops(false);
        }
      },
      () => {
        setLoadingStops(false);
        setError('Could not access your location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onSearch = async () => {
    if (!query.trim()) return;
    setLoadingStops(true);
    try {
      setError('');
      const { data } = await searchStops(query.trim());
      setStops(Array.isArray(data?.stops) ? data.stops : []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to search stops';
      setError(String(msg));
    } finally {
      setLoadingStops(false);
    }
  };

  const onPickStop = async (stop) => {
    setSelectedStop(stop);
    try {
      const { data } = await getUpcomingBuses(stop.id, 12);
      setUpcoming(Array.isArray(data?.upcoming_buses) ? data.upcoming_buses : []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load upcoming buses';
      setError(String(msg));
      setUpcoming([]);
    }
  };

  const stopMarkers = useMemo(() => stops.filter((s) => Number.isFinite(s?.lat) && Number.isFinite(s?.lng)), [stops]);
  const busMarkers = useMemo(() => liveBuses.filter((b) => Number.isFinite(b?.lat) && Number.isFinite(b?.lon)), [liveBuses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">Nearby Stops & Live Buses</h1>
        <p className="mt-2 text-slate-400">
          Find nearby stops, inspect upcoming buses, and monitor live simulated bus movement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stop by name (e.g. Badda)"
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={loadingStops}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Search
        </button>
        <button
          type="button"
          onClick={onUseLocation}
          disabled={loadingStops}
          className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-60"
        >
          Use My Location
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold text-white">Nearby/Search Results</h2>
            <p className="mt-1 text-xs text-slate-400">
              Stops are sorted by distance when location is used.
            </p>
            <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {loadingStops ? (
                <p className="text-sm text-slate-400">Loading stops...</p>
              ) : stops.length ? (
                stops.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPickStop(s)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedStop?.id === s.id
                        ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
                        : 'border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {Number.isFinite(s.distance) ? `${s.distance.toFixed(2)} km` : 'distance n/a'}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-400">No stops found yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedStop ? `Upcoming at ${selectedStop.name}` : 'Upcoming buses'}
            </h2>
            <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {selectedStop ? (
                upcoming.length ? (
                  upcoming.map((u) => (
                    <div key={`${u.bus_id}-${u.route_name}`} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm">
                      <p className="font-semibold text-white">{u.route_name}</p>
                      <p className="text-slate-300">Bus {u.bus_id}</p>
                      <p className="text-emerald-300">ETA {u.eta_minutes} min</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No upcoming buses for this stop.</p>
                )
              ) : (
                <p className="text-sm text-slate-400">Select a stop to see upcoming buses.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-[420px] overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
            <MapContainer center={DHAKA_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {stopMarkers.map((s) => (
                <CircleMarker
                  key={`stop-${s.id}`}
                  center={[s.lat, s.lng]}
                  radius={4}
                  pathOptions={{ color: '#38bdf8', fillColor: '#22d3ee', fillOpacity: 0.85 }}
                >
                  <Tooltip>{s.name}</Tooltip>
                </CircleMarker>
              ))}
              {busMarkers.map((b) => (
                <CircleMarker
                  key={`bus-${b.bus_id}`}
                  center={[b.lat, b.lon]}
                  radius={5}
                  pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.95 }}
                >
                  <Tooltip>
                    {b.bus_id} · {b.route_name}
                    {'\n'}
                    {b.from_stop} → {b.to_stop}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Live bus feed</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">
                  {loadingBuses ? 'Refreshing...' : `${liveBuses.length} buses`}
                </span>
                <span
                  className={`rounded px-2 py-0.5 ${
                    socketMode === 'live'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : socketMode === 'fallback'
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {socketMode === 'live' ? 'WebSocket live' : socketMode === 'fallback' ? 'Polling fallback' : 'Connecting'}
                </span>
              </div>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-1">Bus</th>
                    <th className="py-1">Route</th>
                    <th className="py-1">Now</th>
                    <th className="py-1">Loops</th>
                  </tr>
                </thead>
                <tbody>
                  {liveBuses.map((b) => (
                    <tr key={b.bus_id} className="border-t border-white/5">
                      <td className="py-1">{b.bus_id}</td>
                      <td className="py-1">{b.route_name}</td>
                      <td className="py-1">{b.from_stop ?? '—'} → {b.to_stop ?? '—'}</td>
                      <td className="py-1">{b.loop_count_today ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NearbyLive;
