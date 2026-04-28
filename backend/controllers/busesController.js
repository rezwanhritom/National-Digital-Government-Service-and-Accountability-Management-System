import fleetSimulationService from '../services/fleetSimulationService.js';
import { getStopByIdOrName } from '../services/transitDataService.js';

export const getUpcomingBuses = async (req, res) => {
  const { stop_id } = req.params;
  if (!stop_id) {
    return res.status(400).json({ error: 'Stop ID required' });
  }
  try {
    const stop = await getStopByIdOrName(stop_id);
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    const n = Number(req.query?.limit ?? 10);
    const limit = Number.isFinite(n) ? Math.max(1, Math.min(30, Math.floor(n))) : 10;
    const upcomingBuses = await fleetSimulationService.getUpcomingForStop(stop.name, limit);
    return res.json({ stop_id: stop.id, stop_name: stop.name, upcoming_buses: upcomingBuses });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load upcoming buses' });
  }
};

export const getLiveBusLocations = async (req, res) => {
  try {
    const routeFilter = String(req.query?.route_name ?? '').trim();
    const snapshot = await fleetSimulationService.getFleetSnapshot();
    const buses = Array.isArray(snapshot?.buses) ? snapshot.buses : [];
    const filtered = routeFilter
      ? buses.filter((b) => String(b.route_name).trim().toLowerCase() === routeFilter.toLowerCase())
      : buses;
    return res.json({
      simulation_time_iso: snapshot?.simulation_time_iso ?? null,
      simulation_time_scale: snapshot?.simulation_time_scale ?? 1,
      buses: filtered,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load live buses' });
  }
};

export const getBusLocation = async (req, res) => {
  const { bus_id } = req.params;
  try {
    const bus = await fleetSimulationService.getBus(String(bus_id));
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    return res.json({ bus });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load bus location' });
  }
};