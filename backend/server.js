import 'dotenv/config';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { attachLiveSocketHub } from './services/liveSocketHub.js';

console.log('Starting server...');
const PORT = process.env.PORT || 5000;
console.log(`Port: ${PORT}`);

connectDB()
  .then(() => {
    console.log('DB connected, starting app...');
    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.SOCKET_CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });
    attachLiveSocketHub(io);
    httpServer.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} on port ${PORT}`);
      console.log(`Socket.IO ready at ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
