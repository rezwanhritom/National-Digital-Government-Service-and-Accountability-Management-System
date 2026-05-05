import ApiMetrics from '../models/ApiMetrics.js';

const metricsCollector = async (req, res, next) => {
  const startTime = Date.now();

  // Store original send method
  const originalSend = res.send;
  let responseBodySize = 0;

  // Override send method to capture response size
  res.send = function(data) {
    responseBodySize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data.toString());
    return originalSend.call(this, data);
  };

  // When response finishes
  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - startTime;
      const requestBodySize = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;

      // Create metrics record
      const metrics = new ApiMetrics({
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
        requestBodySize,
        responseBodySize,
        userId: req.user?.id || req.headers['x-api-key'],
        ipAddress: req.ip || req.connection.remoteAddress,
        errorMessage: res.locals.error,
        errorStack: res.locals.errorStack,
      });

      // Save asynchronously (don't block response)
      await metrics.save();
    } catch (error) {
      console.error('Failed to save API metrics:', error);
    }
  });

  next();
};

export default metricsCollector;