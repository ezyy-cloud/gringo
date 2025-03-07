/**
 * Rate Limiter Middleware
 */
const config = require('../config');

// Simple in-memory rate limiter
const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = config.MAX_REQUESTS_PER_MINUTE || 100;

// Clean up the request counts periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      requestCounts.delete(ip);
    }
  }
}, WINDOW_MS);

/**
 * Rate limiter middleware
 * Limits requests based on IP address
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, {
      count: 1,
      windowStart: now
    });
    return next();
  }
  
  const data = requestCounts.get(ip);
  
  // Reset window if it has expired
  if (now - data.windowStart > WINDOW_MS) {
    requestCounts.set(ip, {
      count: 1,
      windowStart: now
    });
    return next();
  }
  
  // Check if over the limit
  if (data.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
  
  // Increment the count
  data.count += 1;
  requestCounts.set(ip, data);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - data.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil((data.windowStart + WINDOW_MS - now) / 1000));
  
  next();
}

module.exports = rateLimiter; 