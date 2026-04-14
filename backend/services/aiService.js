import axios from 'axios';

let cachedClient = null;
let cachedBaseUrl = null;

function getAiClient() {
  const baseURL = (process.env.AI_SERVICE_URL || '').trim().replace(/\/$/, '');
  if (!baseURL) {
    const err = new Error('AI_SERVICE_URL is not configured');
    err.statusCode = 503;
    throw err;
  }
  if (cachedClient && cachedBaseUrl === baseURL) {
    return cachedClient;
  }
  cachedBaseUrl = baseURL;
  cachedClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return cachedClient;
}

export const getETA = async (payload) => {
  const { data } = await getAiClient().post('/eta', payload);
  return data;
};

export const getCrowding = async (payload) => {
  const { data } = await getAiClient().post('/crowding', payload);
  return data;
};

export const classifyIncident = async (payload) => {
  const { data } = await getAiClient().post('/incidents/classify', payload);
  return data;
};

export const getImpact = async (payload) => {
  const { data } = await getAiClient().post('/incidents/impact', payload);
  return data;
};
