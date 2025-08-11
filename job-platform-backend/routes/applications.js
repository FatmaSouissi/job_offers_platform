// routes/applications.js
const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { auth, requireRole } = require('../middleware/auth');
const { validateApplication } = require('../middleware/validation');

// POST /api/applications
// Create a new application
// @access  Private (Job Seekers)
router.post('/', auth, requireRole(['job_seeker']), validateApplication, async (req, res) => {
    try {
        const applicationData = {
            ...req.body,
            userId: req.user.id
        };
        
        const application = await Application.create(applicationData);
        res.status(201).json({
            success: true,
            data: application,
            message: 'Application submitted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/applications
// Get all applications with filters
// @access  Private (Admin, Company)
router.get('/', auth, requireRole(['admin', 'company']), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            userId,
            jobOfferId,
            companyId,
            status,
            sortBy = 'applied_at',
            sortOrder = 'DESC'
        } = req.query;

        const filters = {
            page: parseInt(page),
            limit: parseInt(limit),
            userId,
            jobOfferId,
            companyId: req.user.role === 'company' ? req.user.companyId : companyId,
            status,
            sortBy,
            sortOrder
        };

        const applications = await Application.findAll(filters);
        const total = await Application.getCount(filters);

        res.json({
            success: true,
            data: applications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/applications/my
// Get current user's applications

router.get('/my', auth, requireRole(['job_seeker']), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const applications = await Application.getByUser(
            req.user.id,
            parseInt(page),
            parseInt(limit)
        );
        
        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/applications/job/:jobId
// Get applications for a specific job
router.get('/job/:jobId', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const applications = await Application.getByJobOffer(
            req.params.jobId,
            parseInt(page),
            parseInt(limit)
        );
        
        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/applications/company/:companyId
// Get applications for a company
router.get('/company/:companyId', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const companyId = req.user.role === 'company' ? req.user.companyId : req.params.companyId;
        
        const applications = await Application.getByCompany(
            companyId,
            parseInt(page),
            parseInt(limit),
            status
        );
        
        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/applications/statistics
// Get application statistics
router.get('/statistics', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const companyId = req.user.role === 'company' ? req.user.companyId : req.query.companyId;
        const userId = req.user.role === 'job_seeker' ? req.user.id : req.query.userId;
        
        const statistics = await Application.getStatistics(companyId, userId);
        
        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/applications/recent
// Get recent applications
router.get('/recent', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const companyId = req.user.role === 'company' ? req.user.companyId : req.query.companyId;
        
        const applications = await Application.getRecent(parseInt(limit), companyId);
        
        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/applications/trends
// Get application trends

router.get('/trends', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { months = 6 } = req.query;
        const companyId = req.user.role === 'company' ? req.user.companyId : req.query.companyId;
        
        const trends = await Application.getTrends(companyId, parseInt(months));
        
        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

//  GET /api/applications/:id
// Get application by ID with details

router.get('/:id', auth, async (req, res) => {
    try {
        const application = await Application.findByIdWithDetails(req.params.id);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        // Check if user has permission to view this application
        if (req.user.role === 'job_seeker' && application.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        res.json({
            success: true,
            data: application
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// PUT /api/applications/:id/status
// Update application status

router.put('/:id/status', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        const application = await Application.findById(req.params.id);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        const updatedApplication = await application.updateStatus(status, req.user.id);
        
        res.json({
            success: true,
            data: updatedApplication,
            message: 'Application status updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/applications/:id
// Update application details

router.put('/:id', auth, requireRole(['job_seeker']), async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        if (application.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const updatedApplication = await application.update(req.body);
        
        res.json({
            success: true,
            data: updatedApplication,
            message: 'Application updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/applications/bulk/status
// @desc    Bulk update application statuses
// @access  Private (Company, Admin)
router.put('/bulk/status', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { applicationIds, status } = req.body;
        
        if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Application IDs are required'
            });
        }
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        await Application.bulkUpdateStatus(applicationIds, status, req.user.id);
        
        res.json({
            success: true,
            message: 'Applications updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/applications/:id
// @desc    Delete application
// @access  Private (Job Seeker - own applications only)
router.delete('/:id', auth, requireRole(['job_seeker']), async (req, res) => {
    try {
        const application = await Application.findById(req.params.id);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        if (application.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        await application.delete();
        
        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/applications/check/:jobId
// @desc    Check if user can apply to a job
// @access  Private (Job Seekers)
router.get('/check/:jobId', auth, requireRole(['job_seeker']), async (req, res) => {
    try {
        const canApply = await Application.canUserApply(req.user.id, req.params.jobId);
        
        res.json({
            success: true,
            data: { canApply }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;