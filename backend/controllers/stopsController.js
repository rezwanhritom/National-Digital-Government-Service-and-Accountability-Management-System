// Mock bus stops data
const busStops = [
  { id: 1, name: "Motijheel Central", lat: 23.7333, lng: 90.4167 },
  { id: 2, name: "Shahbagh Square", lat: 23.7386, lng: 90.3958 },
  { id: 3, name: "Dhanmondi Lake", lat: 23.7461, lng: 90.3742 },
  { id: 4, name: "Gulshan Circle", lat: 23.7925, lng: 90.4078 },
  { id: 5, name: "Uttara Sector 3", lat: 23.8759, lng: 90.3794 },
  { id: 6, name: "Mirpur 10", lat: 23.8069, lng: 90.3686 },
  { id: 7, name: "Banani DOHS", lat: 23.7937, lng: 90.4036 },
  { id: 8, name: "Mohammadpur Bus Stand", lat: 23.7574, lng: 90.3594 },
];

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
  const { lat, lng, radius = 5 } = req.query; // radius in km, default 5km
  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and longitude required" });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const searchRadius = parseFloat(radius);

  const nearbyStops = busStops
    .map(stop => ({
      ...stop,
      distance: calculateDistance(userLat, userLng, stop.lat, stop.lng)
    }))
    .filter(stop => stop.distance <= searchRadius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10); // Limit to 10 closest

  res.json({ stops: nearbyStops });
};

export const searchStops = (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: "Search query required" });
  }

  const results = busStops.filter(stop =>
    stop.name.toLowerCase().includes(query.toLowerCase())
  );

  res.json({ stops: results });
};