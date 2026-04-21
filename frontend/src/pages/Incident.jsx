import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import { getIncidentAreas, submitIncident as submitIncidentAPI } from '../services/api';

const DHAKA_CENTER = [23.8103, 90.4125];

function distanceSquared(lat1, lng1, lat2, lng2) {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
}

function LocationPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Incident() {
  const [formData, setFormData] = useState({
    category: '',
    area: '',
    busId: '',
    routeId: '',
    latitude: '',
    longitude: '',
    description: '',
  });
  const [media, setMedia] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const nearestAreaName = useMemo(() => {
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !areas.length) return '';
    let best = null;
    for (const area of areas) {
      const centerLat = Number(area?.center?.lat);
      const centerLng = Number(area?.center?.lng);
      if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) continue;
      const score = distanceSquared(lat, lng, centerLat, centerLng);
      if (!best || score < best.score) {
        best = { name: area.area, score };
      }
    }
    return best?.name ?? '';
  }, [areas, formData.latitude, formData.longitude]);

  useEffect(() => {
    const loadAreas = async () => {
      setLoadingAreas(true);
      try {
        const { data } = await getIncidentAreas();
        const list = Array.isArray(data?.areas) ? data.areas : [];
        setAreas(list);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load available areas');
      } finally {
        setLoadingAreas(false);
      }
    };
    loadAreas();
  }, []);

  useEffect(() => {
    if (nearestAreaName) {
      setFormData((prev) => (prev.area === nearestAreaName ? prev : { ...prev, area: nearestAreaName }));
    }
  }, [nearestAreaName]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setMedia(Array.from(e.target.files));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          setMessage('Unable to get current location. Please enter manually.');
        }
      );
    } else {
      setMessage('Geolocation is not supported by this browser.');
    }
  };

  const handleMapPick = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });
      media.forEach((file) => {
        submitData.append('media', file);
      });

      await submitIncidentAPI(submitData);

      setMessage('Incident submitted successfully!');
      // Reset form
      setFormData({
        category: '',
        area: '',
        busId: '',
        routeId: '',
        latitude: '',
        longitude: '',
        description: '',
      });
      setMedia([]);
    } catch (error) {
      console.error('Error submitting incident:', error);
      setMessage('Failed to submit incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl"
    >
      <h1 className="text-3xl font-semibold text-white mb-6">Report an Incident</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Category *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option className="bg-white text-slate-900" value="">Select a category</option>
            <option className="bg-white text-slate-900" value="breakdown">Bus Breakdown</option>
            <option className="bg-white text-slate-900" value="unsafe_driving">Unsafe Driving</option>
            <option className="bg-white text-slate-900" value="overcrowding">Overcrowding</option>
            <option className="bg-white text-slate-900" value="road_blockage">Road Blockage</option>
            <option className="bg-white text-slate-900" value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Area *
          </label>
          <select
            name="area"
            value={formData.area}
            onChange={handleInputChange}
            required
            disabled={loadingAreas || !areas.length}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <option className="bg-white text-slate-900" value="">
              {loadingAreas ? 'Loading areas...' : 'Select area'}
            </option>
            {areas.map((a) => (
              <option key={a.area} className="bg-white text-slate-900" value={a.area}>
                {a.area}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-300">
            Auto-selects nearest area when coordinates are set (manual input, current location, or map click).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Bus ID (optional)
            </label>
            <input
              type="text"
              name="busId"
              value={formData.busId}
              onChange={handleInputChange}
              placeholder="e.g., BUS-123"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Route ID (optional)
            </label>
            <input
              type="text"
              name="routeId"
              value={formData.routeId}
              onChange={handleInputChange}
              placeholder="e.g., ROUTE-456"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Location *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleInputChange}
              placeholder="Latitude"
              step="any"
              required
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleInputChange}
              placeholder="Longitude"
              step="any"
              required
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={getCurrentLocation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Get Current Location
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            {nearestAreaName ? `Nearest area from coordinates: ${nearestAreaName}` : 'Set coordinates to auto-detect nearest area.'}
          </p>
        </div>

        <div className="h-[320px] overflow-hidden rounded-lg border border-white/20 bg-slate-900/70">
          <MapContainer center={DHAKA_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationPicker onPick={handleMapPick} />
            {Number.isFinite(Number(formData.latitude)) && Number.isFinite(Number(formData.longitude)) ? (
              <CircleMarker
                center={[Number(formData.latitude), Number(formData.longitude)]}
                radius={7}
                pathOptions={{ color: '#ef4444', fillColor: '#f87171', fillOpacity: 0.9 }}
              >
                <Tooltip>
                  Selected incident point
                </Tooltip>
              </CircleMarker>
            ) : null}
          </MapContainer>
        </div>
        <p className="text-xs text-slate-300">
          Click on the map to set incident coordinates.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the incident in detail..."
            required
            rows={4}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Media (Photos/Videos - optional)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          {media.length > 0 && (
            <p className="mt-2 text-sm text-slate-300">
              {media.length} file(s) selected
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit Incident Report'}
        </button>
      </form>

      {message && (
        <div className={`mt-6 p-4 rounded-lg ${message.includes('successfully') ? 'bg-green-600/20 border border-green-500' : 'bg-red-600/20 border border-red-500'}`}>
          <p className="text-white">{message}</p>
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-600/20 p-3">
          <p className="text-white">{error}</p>
        </div>
      )}
    </motion.section>
  );
}

export default Incident;
