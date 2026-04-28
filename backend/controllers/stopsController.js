import { getAllStopsData } from '../services/transitDataService.js';

// Calculate distance between two points (Haversine formula approximation)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return 6371 * c; // Earth radius in km
}

export const getNearbyStops = (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const searchRadius = parseFloat(radius);
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return res.status(400).json({ error: 'Latitude and longitude must be valid numbers' });
  }
  if (!Number.isFinite(searchRadius) || searchRadius <= 0 || searchRadius > 20) {
    return res.status(400).json({ error: 'radius must be between 0 and 20 km' });
  }

  getAllStopsData()
    .then((data) => {
      const nearbyStops = data.stops
        .map((stop) => ({
          ...stop,
          distance: calculateDistance(userLat, userLng, stop.lat, stop.lng),
          routes: data.routesByStop.get(String(stop.name).trim().toLowerCase()) ?? [],
        }))
        .filter((stop) => stop.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20);
      res.json({ stops: nearbyStops });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || 'Failed to load stops data' });
    });
};

export const searchStops = (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }
  getAllStopsData()
    .then((data) => {
      const q = String(query).toLowerCase().trim();
      const results = data.stops
        .filter((stop) => stop.name.toLowerCase().includes(q))
        .map((stop) => ({
          ...stop,
          routes: data.routesByStop.get(String(stop.name).trim().toLowerCase()) ?? [],
        }))
        .slice(0, 25);
      res.json({ stops: results });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || 'Failed to search stops' });
    });
};