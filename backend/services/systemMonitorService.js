import SystemMetrics from '../models/SystemMetrics.js';
import QueueMetrics from '../models/QueueMetrics.js';
import StorageMetrics from '../models/StorageMetrics.js';
import ApiMetrics from '../models/ApiMetrics.js';
import os from 'os';
import { performance } from 'perf_hooks';

class SystemMonitorService {
  constructor() {
    this.collectionInterval = 30000; // 30 seconds
    this.isRunning = false;
    this.startTime = performance.now();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.collectMetrics();
    this.interval = setInterval(() => this.collectMetrics(), this.collectionInterval);
    console.log('System monitoring service started');
  }

  stop() {
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    console.log('System monitoring service stopped');
  }

  async collectMetrics() {
    try {
      const timestamp = new Date();
      const metrics = await this.gatherSystemMetrics();

      // Save system metrics
      await SystemMetrics.create({
        ...metrics.system,
        timestamp
      });

      // Save queue metrics
      await QueueMetrics.create({
        ...metrics.queue,
        timestamp
      });

      // Save storage metrics
      await StorageMetrics.create({
        ...metrics.storage,
        timestamp
      });

      // Save API metrics
      await ApiMetrics.create({
        ...metrics.api,
        timestamp
      });

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  async gatherSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    return {
      system: {
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        memoryUsage: memUsage.heapUsed / memUsage.heapTotal * 100,
        totalMemory: memUsage.heapTotal,
        usedMemory: memUsage.heapUsed,
        uptime: uptime,
        loadAverage: os.loadavg(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      },
      queue: {
        depth: Math.floor(Math.random() * 100), // Mock queue depth
        processingRate: Math.random() * 100,
        errorRate: Math.random() * 5,
        avgProcessingTime: Math.random() * 1000
      },
      storage: {
        totalSpace: 1000000000, // Mock 1GB
        usedSpace: Math.random() * 1000000000,
        availableSpace: Math.random() * 500000000,
        readOps: Math.floor(Math.random() * 1000),
        writeOps: Math.floor(Math.random() * 1000),
        avgReadTime: Math.random() * 10,
        avgWriteTime: Math.random() * 10
      },
      api: {
        totalRequests: Math.floor(Math.random() * 10000),
        errorRequests: Math.floor(Math.random() * 100),
        avgResponseTime: Math.random() * 500,
        p95ResponseTime: Math.random() * 1000,
        p99ResponseTime: Math.random() * 2000,
        throughput: Math.random() * 100
      }
    };
  }

  async getSystemHealth() {
    try {
      const latest = await SystemMetrics.findOne()
        .sort({ timestamp: -1 });

      if (!latest) {
        return { status: 'unknown', message: 'No metrics available' };
      }

      const isHealthy = latest.memoryUsage < 90 && latest.cpuUsage < 80;

      return {
        status: isHealthy ? 'healthy' : 'warning',
        timestamp: latest.timestamp,
        metrics: {
          cpuUsage: latest.cpuUsage,
          memoryUsage: latest.memoryUsage,
          uptime: latest.uptime
        }
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return { status: 'error', message: error.message };
    }
  }

  async getMetricsHistory(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [system, queue, storage, api] = await Promise.all([
        SystemMetrics.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 }),
        QueueMetrics.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 }),
        StorageMetrics.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 }),
        ApiMetrics.find({ timestamp: { $gte: since } }).sort({ timestamp: 1 })
      ]);

      return {
        system,
        queue,
        storage,
        api
      };
    } catch (error) {
      console.error('Error getting metrics history:', error);
      throw error;
    }
  }

  async getCurrentMetrics() {
    try {
      const [system, queue, storage, api] = await Promise.all([
        SystemMetrics.findOne().sort({ timestamp: -1 }),
        QueueMetrics.findOne().sort({ timestamp: -1 }),
        StorageMetrics.findOne().sort({ timestamp: -1 }),
        ApiMetrics.findOne().sort({ timestamp: -1 })
      ]);

      return {
        system,
        queue,
        storage,
        api,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting current metrics:', error);
      throw error;
    }
  }
}

export default new SystemMonitorService();
