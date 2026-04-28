import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Stops API
export const getNearbyStops = (lat, lng, radius = 5) => {
  return api.get('/stops/nearby', { params: { lat, lng, radius } });
};

export const searchStops = (query) => {
  return api.get('/stops/search', { params: { query } });
};

// Buses API
export const getUpcomingBuses = (stopId, limit = 10) => {
  return api.get(`/stops/${stopId}/buses`, { params: { limit } });
};

export const getLiveBusLocations = (params = {}) => {
  return api.get('/buses/live', { params });
};

export const getBusLocation = (busId) => {
  return api.get(`/buses/${busId}/location`);
};

// AI Services
export const getETA = (payload) => {
  return api.post('/ai/test', payload);
};

// Incidents
export const submitIncident = (formData) => {
  return api.post('/incidents/submit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getIncidentAreas = () => {
  return api.get('/incidents/areas');
};

export const getIncidents = (params) => {
  return api.get('/incidents', { params });
};

// Dashboard
export const getDashboardStats = () => {
  return api.get('/dashboard/stats');
};

export const getIncidentsHeatmap = () => {
  return api.get('/dashboard/heatmap');
};

export default api;
