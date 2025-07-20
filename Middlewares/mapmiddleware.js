// Map Application Middleware Collection
// All middleware functions for the mapping application

const express = require('express');

// Security Headers Middleware
const securityHeaders = (req, res, next) => {
  // CORS Headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Security Headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

// Request Logging Middleware
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const clientIP = req.ip || req.connection.remoteAddress || 'Unknown';
  
  // Add request start time for performance tracking
  req.startTime = Date.now();
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${clientIP} - ${userAgent}`);
  next();
};

// Request Size Limiting Middleware
const requestSizeLimiter = () => {
  return [
    express.json({ limit: '10mb' }),
    express.urlencoded({ extended: true, limit: '10mb' })
  ];
};

// Request Timeout Middleware
const requestTimeout = (req, res, next) => {
  const timeoutMs = 30000; // 30 seconds
  
  req.setTimeout(timeoutMs, () => {
    console.log(`Request timeout (${timeoutMs}ms): ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'Request timeout',
        message: `Request exceeded ${timeoutMs / 1000} seconds timeout`,
        timestamp: new Date().toISOString()
      });
    }
  });
  next();
};

// Rate Limiting Middleware (Basic implementation)
const requestCounts = new Map();
const rateLimiter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // requests per window
  
  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + windowMs });
  } else {
    const clientData = requestCounts.get(clientIP);
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count++;
      if (clientData.count > maxRequests) {
        console.log(`Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({ 
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  next();
};

// API Request Validation Middleware
const validateApiRequest = (req, res, next) => {
  // Log incoming API request details
  console.log(`[API] ${req.method} ${req.originalUrl}`, {
    query: Object.keys(req.query).length > 0 ? req.query : 'None',
    body: Object.keys(req.body).length > 0 ? req.body : 'None',
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent') || 'Unknown'
  });
  
  // Add response timing tracking
  const startTime = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    console.log(`[API Response] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`);
  });
  
  next();
};

// Response Time Tracker Middleware
const responseTimeTracker = (req, res, next) => {
  const startTime = Date.now();
  
  // Set response time header before response finishes
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    if (!res.headersSent) {
      res.set('X-Response-Time', `${responseTime}ms`);
    }
    return originalSend.call(this, data);
  };
  
  next();
};

// Database Error Handler Middleware
const handleDatabaseErrors = (error, req, res, next) => {
  console.error('Database Error:', {
    message: error.message,
    code: error.code,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle different types of database errors
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({ 
      error: 'Database connection failed',
      message: 'Unable to connect to the database. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.code === 'ETIMEOUT') {
    return res.status(504).json({ 
      error: 'Database timeout',
      message: 'Database query timed out. Please try again.',
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'ENOTFOUND') {
    return res.status(503).json({ 
      error: 'Database server not found',
      message: 'Cannot locate database server.',
      timestamp: new Date().toISOString()
    });
  }
  
  // Default database error
  return res.status(500).json({ 
    error: 'Database error',
    message: 'An error occurred while processing your request.',
    timestamp: new Date().toISOString()
  });
};

// 404 Handler Middleware
const notFoundHandler = (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url} - IP: ${req.ip || 'Unknown'}`);
  res.status(404).json({ 
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.url} does not exist`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /map/config',
      'GET /map/locations'
    ],
    timestamp: new Date().toISOString()
  });
};

// Global Error Handling Middleware
const globalErrorHandler = (error, req, res, next) => {
  console.error(`[GLOBAL ERROR] ${new Date().toISOString()}:`, {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const statusCode = error.status || error.statusCode || 500;
  
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : error.name || 'Error',
    message: isDevelopment ? error.message : 'Something went wrong. Please try again.',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown',
    ...(isDevelopment && { 
      stack: error.stack,
      details: {
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query
      }
    })
  });
};

// Health Check Handler
const healthCheck = (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({ 
    status: 'OK',
    message: 'Map application server is running',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
    },
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    version: process.version
  });
};

// Request ID Generator Middleware
const requestIdGenerator = (req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.set('X-Request-ID', req.id);
  next();
};

// CORS Preflight Handler
const corsPreflightHandler = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.sendStatus(200);
  }
  next();
};

// Export all middleware functions
module.exports = {
  // Individual middleware functions
  securityHeaders,
  requestLogger,
  requestTimeout,
  rateLimiter,
  validateApiRequest,
  responseTimeTracker,
  handleDatabaseErrors,
  notFoundHandler,
  globalErrorHandler,
  healthCheck,
  requestIdGenerator,
  corsPreflightHandler,
  
  // Middleware arrays for easy application
  requestSizeLimiter,
  
  // Complete middleware stack for easy setup
  setupBasicMiddleware: (app) => {
    app.use(requestIdGenerator);
    app.use(corsPreflightHandler);
    app.use(securityHeaders);
    app.use(requestLogger);
    app.use(responseTimeTracker);
    app.use(requestTimeout);
    app.use(rateLimiter);
    app.use(...requestSizeLimiter());
  },
  
  setupErrorHandling: (app) => {
    app.use(notFoundHandler);
    app.use(handleDatabaseErrors);
    app.use(globalErrorHandler);
  },
  
  // Health check route setup
  setupHealthCheck: (app) => {
    app.get('/health', healthCheck);
  }
};