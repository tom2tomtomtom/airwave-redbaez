const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API proxy
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );
  
  // WebSocket proxy - redirect WS connections to correct server
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      ws: true,
      changeOrigin: true,
    })
  );
};
