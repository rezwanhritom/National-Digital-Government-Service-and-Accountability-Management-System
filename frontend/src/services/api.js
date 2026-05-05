import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let authState = {
  accessToken: '',
  refreshToken: '',
  onUnauthorized: null,
};

export function configureAuthApi({ getAccessToken, getRefreshToken, setAccessToken, onUnauthorized }) {
  authState.getAccessToken = getAccessToken;
  authState.getRefreshToken = getRefreshToken;
  authState.setAccessToken = setAccessToken;
  authState.onUnauthorized = onUnauthorized;
}

api.interceptors.request.use((config) => {
  const token = authState.getAccessToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    const refreshToken = authState.getRefreshToken?.();
    if (!refreshToken) {
      authState.onUnauthorized?.();
      return Promise.reject(error);
    }

    try {
      original._retry = true;
      const refreshRes = await axios.post(
        `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
        { refreshToken },
      );
      const accessToken = refreshRes.data?.accessToken;
      if (accessToken) {
        authState.setAccessToken?.(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      }
      authState.onUnauthorized?.();
      return Promise.reject(error);
    } catch (refreshError) {
      authState.onUnauthorized?.();
      return Promise.reject(refreshError);
    }
  },
);

// Auth API
export const signup = (payload) => api.post('/auth/signup', payload);
export const login = (payload) => api.post('/auth/login', payload);
export const logout = (refreshToken) => api.post('/auth/logout', { refreshToken });
export const getMe = () => api.get('/auth/me');

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

export const getOperatorPerformance = () => {
  return api.get('/dashboard/operator-performance');
};

// Admin APIs
export const listUsers = (params = {}) => api.get('/admin/users', { params });
export const listRoleRequests = () => api.get('/admin/role-requests');
export const updateUserRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role });
export const updateUserStatus = (id, accountStatus) =>
  api.patch(`/admin/users/${id}/status`, { accountStatus });
export const requestRoleUpgrade = (requestedRole) =>
  api.post('/admin/request-role', { requestedRole });

export default api;
