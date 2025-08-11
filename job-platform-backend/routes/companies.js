// routes/companies.js
const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { validateCompany } = require('../middleware/validation');

//  POST /api/companies
// Create a new company
router.post('/', auth, requireRole(['company']), validateCompany, async (req, res) => {
    try {
        const companyData = {
            ...req.body,
            userId: req.user.id
        };
        
        const company = await Company.create(companyData);
        res.status(201).json({
            success: true,
            data: company,
            message: 'Company created successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

//  GET /api/companies
//  Get all companies with pagination and search
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            industry,
            companySize
        } = req.query;

        const companies = await Company.findAll(
            parseInt(page),
            parseInt(limit),
            search,
            industry,
            companySize
        );
        
        const total = await Company.getCount(search, industry, companySize);

        res.json({
            success: true,
            data: companies,
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

// GET /api/companies/search
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
        
        const companies = await Company.search(searchTerm, parseInt(limit));
        
        res.json({
            success: true,
            data: companies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

//  GET /api/companies/industries
// Get unique industries
router.get('/industries', async (req, res) => {
    try {
        const industries = await Company.getIndustries();
        
        res.json({
            success: true,
            data: industries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/companies/my
//  Get current user's company
router.get('/my', auth, requireRole(['company']), async (req, res) => {
    try {
        const company = await Company.findByUserId(req.user.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/companies/:id
// Get company by ID
router.get('/:id', async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/companies/:id/details
// Get company with user details
router.get('/:id/details', auth, requireRole(['admin', 'company']), async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        // Check if user has permission to view details
        if (req.user.role === 'company' && company.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const companyDetails = await company.getWithUserDetails();
        
        res.json({
            success: true,
            data: companyDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/companies/:id/jobs
// Get company's job offers
router.get('/:id/jobs', async (req, res) => {
    try {
        const { status = 'active' } = req.query;
        
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        const jobs = await company.getJobOffers(status);
        
        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/companies/:id/statistics
// Get company statistics
router.get('/:id/statistics', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        // Check if user has permission to view statistics
        if (req.user.role === 'company' && company.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const statistics = await company.getStatistics();
        
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

//  GET /api/companies/:id/applications/recent
// Get recent applications for company's jobs
router.get('/:id/applications/recent', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        // Check if user has permission to view applications
        if (req.user.role === 'company' && company.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const applications = await company.getRecentApplications(parseInt(limit));
        
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

// PUT /api/companies/:id
// Update company
router.put('/:id', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        // Check if user has permission to update
        if (req.user.role === 'company' && company.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const updatedCompany = await company.update(req.body);
        
        res.json({
            success: true,
            data: updatedCompany,
            message: 'Company updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE /api/companies/:id
//  Delete company
router.delete('/:id', auth, requireRole(['company', 'admin']), async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }
        
        // Check if user has permission to delete
        if (req.user.role === 'company' && company.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        await company.delete();
        
        res.json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;