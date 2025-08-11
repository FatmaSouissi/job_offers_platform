const express = require('express');
const db = require('./config/database');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const userRoutes = require('./routes/users');
const jobOffersRoutes = require('./routes/jobOffers');
const applicationsRoutes = require('./routes/applications');
const companyRoutes = require('./routes/companies');
const uploadRouter = require('./routes/upload');
const cors = require('cors');

const app = express();

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads', 'resumes');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure CORS middleware
app.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true
}));

// Serve static files from uploads directory (remove the duplicate line below)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes - Move these before error handling middleware
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobOffersRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/upload', uploadRouter);


// Error handling middleware - Move this to the end
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle multer errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'File too large'
            });
        }
    }
    // Handle JSON parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON payload'
        });
    }

    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});


const PORT = process.env.PORT || 3000;

// Test DB and start server
db.testConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📁 Upload directory: ${uploadsDir}`);
    });
}).catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
});