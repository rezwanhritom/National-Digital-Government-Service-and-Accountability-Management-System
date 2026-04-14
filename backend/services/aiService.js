import axios from 'axios';

const aiClient = axios.create({
  baseURL: process.env.AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getETA = async (payload) => {
  const { data } = await aiClient.post('/eta', payload);
  return data;
};

export const getCrowding = async (payload) => {
  const { data } = await aiClient.post('/crowding', payload);
  return data;
};

export const classifyIncident = async (payload) => {
  const { data } = await aiClient.post('/incidents/classify', payload);
  return data;
};

export const getImpact = async (payload) => {
  const { data } = await aiClient.post('/incidents/impact', payload);
  return data;
};
