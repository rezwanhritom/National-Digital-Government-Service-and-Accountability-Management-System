import fleetSimulationService from './fleetSimulationService.js';

let broadcastTimer = null;

export function attachLiveSocketHub(io) {
  io.on('connection', async (socket) => {
    socket.emit('live:connected', {
      message: 'Live bus websocket connected',
      ts: new Date().toISOString(),
    });

    socket.on('live:subscribe', async () => {
      try {
        const snapshot = await fleetSimulationService.getFleetSnapshot();
        socket.emit('live:buses', {
          simulation_time_iso: snapshot.simulation_time_iso,
          simulation_time_scale: snapshot.simulation_time_scale,
          buses: snapshot.buses,
        });
      } catch {
        socket.emit('live:error', { message: 'Failed to load live bus snapshot' });
      }
    });
  });

  if (!broadcastTimer) {
    broadcastTimer = setInterval(async () => {
      try {
        const snapshot = await fleetSimulationService.getFleetSnapshot();
        io.emit('live:buses', {
          simulation_time_iso: snapshot.simulation_time_iso,
          simulation_time_scale: snapshot.simulation_time_scale,
          buses: snapshot.buses,
        });
      } catch {
        // Keep server stable if one tick fails.
      }
    }, 3000);
  }
}

export function detachLiveSocketHub() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
}

