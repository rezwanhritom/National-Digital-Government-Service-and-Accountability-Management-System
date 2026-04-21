import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getNearbyStops, searchStops, getUpcomingBuses } from '../services/api';

function Planner() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [upcomingBuses, setUpcomingBuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationError(null);
          fetchNearbyStops(latitude, longitude);
        },
        (error) => {
          setLocationError('Unable to get location. Please search manually.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  };

  // Fetch nearby stops
  const fetchNearbyStops = async (lat, lng) => {
    setLoading(true);
    try {
      const response = await getNearbyStops(lat, lng);
      setStops(response.data.stops);
    } catch (error) {
      console.error('Error fetching nearby stops:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search stops
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const response = await searchStops(searchQuery);
      setStops(response.data.stops);
    } catch (error) {
      console.error('Error searching stops:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle stop selection
  const handleStopClick = async (stop) => {
    setSelectedStop(stop);
    try {
      const response = await getUpcomingBuses(stop.id);
      setUpcomingBuses(response.data.upcoming_buses);
    } catch (error) {
      console.error('Error fetching upcoming buses:', error);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-slate-700/80 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/30"
    >
      <h1 className="text-3xl font-semibold text-white mb-6">Nearby Stops & Live Bus Discovery</h1>

      {/* Search and Location Controls */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row">
        <input
          type="text"
          placeholder="Search for bus stops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:border-cyan-400"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-cyan-500 text-slate-950 rounded-2xl hover:bg-cyan-400 transition-colors"
        >
          Search
        </button>
        <button
          onClick={getCurrentLocation}
          className="px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 transition-colors"
        >
          Use My Location
        </button>
      </div>

      {locationError && (
        <p className="text-red-400 mb-4">{locationError}</p>
      )}

      {/* Stops List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Nearby Bus Stops</h2>
          {loading ? (
            <p className="text-slate-100">Loading...</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stops.map((stop) => (
                <div
                  key={stop.id}
                  onClick={() => handleStopClick(stop)}
                  className={`p-4 rounded-3xl cursor-pointer transition-all duration-200 border ${
                    selectedStop?.id === stop.id
                      ? 'bg-cyan-600/95 text-slate-950 border-cyan-400'
                      : 'bg-slate-800/90 text-slate-100 border-slate-700 hover:bg-slate-700/90'
                  }`}
                >
                  <h3 className="font-semibold">{stop.name}</h3>
                  {stop.distance && (
                    <p className="text-sm opacity-75">{stop.distance.toFixed(1)} km away</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Buses */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            {selectedStop ? `Upcoming Buses at ${selectedStop.name}` : 'Select a stop to view buses'}
          </h2>
          {selectedStop && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingBuses.map((bus, index) => (
                <div key={index} className="p-4 rounded-3xl bg-slate-800/95 text-slate-100 border border-slate-700 shadow-sm shadow-slate-950/20">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h4 className="font-semibold text-white">{bus.route_name}</h4>
                      <p className="text-sm text-slate-400">Bus {bus.bus_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-300">{bus.eta_minutes} min</p>
                      <p className="text-sm text-slate-400">ETA</p>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingBuses.length === 0 && (
                <p className="text-slate-200">No upcoming buses at this time.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export default Planner;
