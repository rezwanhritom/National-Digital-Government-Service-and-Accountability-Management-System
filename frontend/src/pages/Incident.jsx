import { useState } from 'react';
import { motion } from 'framer-motion';
import { submitIncident as submitIncidentAPI } from '../services/api';

function Incident() {
  const [formData, setFormData] = useState({
    category: '',
    busId: '',
    routeId: '',
    latitude: '',
    longitude: '',
    description: '',
  });
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setMedia(Array.from(e.target.files));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      media.forEach(file => {
        submitData.append('media', file);
      });

      await submitIncidentAPI(submitData);

      setMessage('Incident submitted successfully!');
      // Reset form
      setFormData({
        category: '',
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
            <option value="">Select a category</option>
            <option value="breakdown">Bus Breakdown</option>
            <option value="unsafe_driving">Unsafe Driving</option>
            <option value="overcrowding">Overcrowding</option>
            <option value="road_blockage">Road Blockage</option>
            <option value="other">Other</option>
          </select>
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
        </div>

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
    </motion.section>
  );
}

export default Incident;
