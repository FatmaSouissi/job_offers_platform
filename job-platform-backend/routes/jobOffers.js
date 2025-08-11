// routes/jobOffers.js
const express = require('express');
const router = express.Router();
const JobOffer = require('../models/JobOffer');
const { auth, requireRole } = require('../middleware/auth');
const { validateJobOffer } = require('../middleware/validation');
const { Op, Sequelize } = require('sequelize');


// @route   POST /api/jobs
//  Create a new job offer   requireRole(['company']),
// @access  Private (Company users)
router.post('/', auth, validateJobOffer, async (req, res) => {
    try {
        const jobData = {
            ...req.body,
            companyId: req.user.companyId
        };
        
        const job = await JobOffer.create(jobData);
        res.status(201).json({
            success: true,
            data: job,
            message: 'Job offer created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});


// @route   GET /api/jobs
//   Get all job offers with filters

router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            jobType,
            experienceLevel,
            categoryId,
            location,
            isRemote,
            salaryMin,
            salaryMax,
            companyId,
            isActive = true
        } = req.query;

        const filters = {
            page: parseInt(page),
            limit: parseInt(limit),
            searchTerm: search,
            jobType,
            experienceLevel,
            categoryId,
            location,
            isRemote: isRemote !== undefined ? isRemote === 'true' : null,
            salaryMin: salaryMin ? parseInt(salaryMin) : null,
            salaryMax: salaryMax ? parseInt(salaryMax) : null,
            companyId,
            isActive: isActive === 'true'
        };

        const jobs = await JobOffer.findAll(filters);
        const total = await JobOffer.getCount(filters);
        
        res.json({
            success: true,
            data: jobs,
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



// @route   GET /api/jobs/statistics
//  Get job statistics

router.get('/statistics', async (req, res) => {
    try {
        const statistics = await JobOffer.getStatistics();
        
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



// @route   GET /api/jobs/expired
// Get expired job offers

router.get('/expired', auth, requireRole(['admin']), async (req, res) => {
    try {
        const expiredJobs = await JobOffer.getExpiredJobs();
        
        res.json({
            success: true,
            data: expiredJobs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/jobs/:id
//  Get job offer by ID

router.get('/:id', async (req, res) => {
    try {
        const job = await JobOffer.findByIdWithDetails(req.params.id);
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job offer not found'
            });
        }
        
        res.json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});



// PUT /api/jobs/:id
// Update a job offer
// @access  Private (Company owner, Admin)
router.put('/:id', auth, requireRole(['company', 'admin']), validateJobOffer, async (req, res) => {
    try {
        const job = await JobOffer.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job offer not found'
            });
        }

        // Only the company that owns the job or admin can update
        if (req.user.role === 'company' && job.companyId !== req.user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updatedJob = await JobOffer.updateById(req.params.id, req.body);

        res.json({
            success: true,
            data: updatedJob,
            message: 'Job offer updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// DELETE /api/jobs/:id
// @access  Private (Company owner, Admin)
router.delete('/:id', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const job = await JobOffer.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job offer not found'
            });
        }

        // Only the company that owns the job or admin can delete
        if (req.user.role === 'company' && job.companyId !== req.user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await JobOffer.deleteById(req.params.id);

        res.json({
            success: true,
            message: 'Job offer deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// @route   GET /api/jobs/:id/applications
//  Get applications for a job offer
// access  Private (Company owner, Admin)
router.get('/:id/applications', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { status } = req.query;
        
        const job = await JobOffer.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job offer not found'
            });
        }
        
        // Check if user has permission to view applications
        if (req.user.role === 'company' && job.companyId !== req.user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const applications = await job.getApplications(status);
        
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

// @route   GET /api/jobs/:id/applications/stats
// Get application statistics for a job
// access  Private (Company owner, Admin)
router.get('/:id/applications/stats', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const job = await JobOffer.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job offer not found'
            });
        }
        
        // Check if user has permission to view statistics
        if (req.user.role === 'company' && job.companyId !== req.user.companyId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const stats = await JobOffer.getJobApplicationStats(req.params.id);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/jobs/:id/skills
// Get skills for a job offer

router.get('/:id/skills', async (req, res) => {
    try {
        const job = await JobOffer.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job offer not found'
            });
        }
        
        const skills = await job.getSkills();
        
        res.json({
            success: true,
            data: skills
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get similar jobs
router.get('/:id/similar', async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit) || 4;

        // Get the current job to compare with
        const currentJob = await JobOffer.findByPk(jobId);
        if (!currentJob) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Find similar jobs based on category, skills, or location
        const similarJobs = await JobOffer.findAll({
            where: {
                id: { [Op.ne]: jobId }, // Exclude current job
                [Op.or]: [
                    { category: currentJob.category },
                    { location: currentJob.location }
                ],
                status: 'active'
            },
            limit: limit,
            order: Sequelize.literal('rand()') // Random order
        });

         res.json({
            success: true,
            data: similarJobs
        });
    } catch (error) {
        console.error('Error fetching similar jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching similar jobs'
        });
    }
});


router.get('/:id/check-application', auth, async (req, res) => {
    try {
        const jobId = parseInt(req.params.id);
        const userId = req.user.id;

        const application = await Application.findOne({
            where: {
                jobOfferId: jobId,
                userId: userId
            }
        });

         res.json({
            success: true,
            data: {
                hasApplied: !!application,
                application: application
            }
        });
    } catch (error) {
        console.error('Error checking application status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking application status'
        });
    }
});


// GET /api/jobs/search
//  Search companies

router.get('/search', async (req, res) => {
    try {
        const { q: searchTerm, limit = 10 } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        const jobOffers = await JobOffer.search(searchTerm, parseInt(limit));

        res.json({
            success: true,
            data: jobOffers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


module.exports =router;