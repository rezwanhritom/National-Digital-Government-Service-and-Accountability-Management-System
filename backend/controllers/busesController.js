// Mock bus routes and data
const busRoutes = [
  { id: 1, name: "Motijheel to Uttara", stops: [1, 2, 3, 5] },
  { id: 2, name: "Shahbagh to Gulshan", stops: [2, 3, 4, 7] },
  { id: 3, name: "Dhanmondi to Mirpur", stops: [3, 6, 8] },
];

const buses = [
  { id: 1, route_id: 1, current_lat: 23.7400, current_lng: 90.4000, status: "moving" },
  { id: 2, route_id: 2, current_lat: 23.7500, current_lng: 90.3800, status: "moving" },
  { id: 3, route_id: 3, current_lat: 23.7600, current_lng: 90.3600, status: "stopped" },
];

// Mock upcoming buses at stops
function generateUpcomingBuses(stopId) {
  const routesAtStop = busRoutes.filter(route => route.stops.includes(stopId));
  const upcoming = [];

  routesAtStop.forEach(route => {
    // Simulate 1-3 upcoming buses per route
    const numBuses = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numBuses; i++) {
      const eta = Math.floor(Math.random() * 20) + 1; // 1-20 minutes
      upcoming.push({
        bus_id: `${route.id}-${i + 1}`,
        route_id: route.id,
        route_name: route.name,
        eta_minutes: eta,
        arrival_time: new Date(Date.now() + eta * 60000).toISOString()
      });
    }
  });

  return upcoming.sort((a, b) => a.eta_minutes - b.eta_minutes);
}

export const getUpcomingBuses = (req, res) => {
  const { stop_id } = req.params;
  if (!stop_id) {
    return res.status(400).json({ error: "Stop ID required" });
  }

  const stopId = parseInt(stop_id);
  const upcomingBuses = generateUpcomingBuses(stopId);

  res.json({ stop_id: stopId, upcoming_buses: upcomingBuses });
};

export const getLiveBusLocations = (req, res) => {
  // Return current locations of all buses
  res.json({ buses });
};

export const getBusLocation = (req, res) => {
  const { bus_id } = req.params;
  const bus = buses.find(b => b.id == bus_id);
  if (!bus) {
    return res.status(404).json({ error: "Bus not found" });
  }

  res.json({ bus });
};