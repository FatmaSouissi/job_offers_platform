// middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: [
    'http://localhost:4200', 
    'http://127.0.0.1:4200',
    
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  credentials: true, // Allow cookies and credentials
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

module.exports = cors(corsOptions);