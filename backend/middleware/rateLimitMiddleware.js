// Simple in-memory rate limiter implementation
// In production, consider using redis or a more robust solution

const rateLimitStore = new Map();

const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    statusCode = 429,
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip,
    handler = null,
    onLimitReached = null,
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      cleanupExpiredEntries();
    }

    let record = rateLimitStore.get(key);

    if (!record) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, record);
    }

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;

    // Set headers
    if (standardHeaders) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    }

    if (legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
      res.setHeader('X-RateLimit-Reset', record.resetTime);
    }

    // Check if limit exceeded
    if (record.count > max) {
      if (onLimitReached) {
        onLimitReached(req, res);
      }

      if (handler) {
        return handler(req, res);
      }

      return res.status(statusCode).json({
        success: false,
        message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    // Track response to potentially skip counting
    let hasResponded = false;
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    const trackResponse = (fn) => {
      return function(...args) {
        if (!hasResponded) {
          hasResponded = true;

          const shouldSkip = (skipSuccessfulRequests && res.statusCode < 400) ||
                           (skipFailedRequests && res.statusCode >= 400);

          if (shouldSkip && record.count > 0) {
            record.count--;
          }
        }
        return fn.apply(this, args);
      };
    };

    res.send = trackResponse(originalSend);
    res.json = trackResponse(originalJson);
    res.end = trackResponse(originalEnd);

    next();
  };
};

export default rateLimit;
