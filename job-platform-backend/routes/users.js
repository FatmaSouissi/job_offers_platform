// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, requireRole, optionalAuth } = require('../middleware/auth');
const { 
    validateUserRegistration, 
    validateUserProfile, 
    validateLogin,
    validatePasswordChange  // Changed from validateNewPassword
} = require('../middleware/validation');

// @route   POST /api/users/register
router.post('/register', validateUserRegistration, async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        
        const user = await User.create(req.body);
        const token = user.generateToken();
        
        res.status(201).json({
            success: true,
            data: {
                user: user.toJSON(),
                token
            },
            message: 'User registered successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/users/login
router.post('/login', validateLogin, async (req, res) => {
    console.log('🔄 LOGIN REQUEST RECEIVED');
    console.log('📦 Request body:', req.body);
    console.log('📧 Email from request:', req.body.email);
    console.log('🔒 Password from request (length):', req.body.password?.length);
    
    try {
        const { email, password } = req.body;
        
        console.log('🔍 Searching for user with email:', email);
        
        const user = await User.findByEmail(email);
        console.log('👤 User found?', !!user);
        
        if (!user) {
            console.log('❌ NO USER FOUND with email:', email);
            console.log('💡 Available users in DB - run this query to check:');
            console.log('   SELECT email FROM users WHERE is_active = TRUE;');
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        console.log('✅ User found - ID:', user.id, 'Email:', user.email);
        console.log('🔒 Verifying password...');
        
        const isPasswordValid = await user.verifyPassword(password);
        console.log('🔐 Password verification result:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('❌ INVALID PASSWORD for user:', email);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        console.log('🎉 LOGIN SUCCESSFUL - generating token...');
        const token = user.generateToken();
        console.log('🔑 Token generated successfully');
        
        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                token
            },
            message: 'Login successful'
        });
        
        console.log('✅ Login response sent successfully');
        
    } catch (error) {
        console.error('💥 LOGIN ERROR:', error);
        console.error('💥 Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add this route to see what users exist:
router.get('/debug-users', async (req, res) => {
    try {
        const users = await User.findAll(1, 50); // Get first 50 users
        
        const userSummary = users.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
            isActive: user.isActive,
            createdAt: user.createdAt
        }));
        
        console.log('📊 Users in database:', userSummary.length);
        console.log('👥 User emails:', userSummary.map(u => u.email));
        
        res.json({
            success: true,
            count: userSummary.length,
            data: userSummary
        });
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/users/me
// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user.toJSON()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/users/me
// Update current user profile
router.put('/me', auth, validateUserProfile, async (req, res) => {
    try {
        const updatedUser = await req.user.update(req.body);
        
        res.json({
            success: true,
            data: updatedUser.toJSON(),
            message: 'Profile updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/users/change-password
// Change user password - FIXED VERSION
router.put('/change-password', auth, validatePasswordChange, async (req, res) => {
    console.log('🔄 PASSWORD CHANGE REQUEST RECEIVED');
    console.log('📦 Request body:', {
        hasOldPassword: !!req.body.oldPassword,
        hasPassword: !!req.body.password,
        oldPasswordLength: req.body.oldPassword?.length || 0,
        passwordLength: req.body.password?.length || 0
    });
    console.log('👤 User:', { id: req.user?.id, email: req.user?.email });

    try {
        const { oldPassword, password } = req.body;
        
        console.log('🔧 Calling user.changePassword...');
        await req.user.changePassword(oldPassword, password);
        
        console.log('✅ Password changed successfully');
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('❌ Password change error:', error.message);
        
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/users/verify-email
// Verify user email
router.post('/verify-email', auth, async (req, res) => {
    try {
        await req.user.verifyEmail();
        
        res.json({
            success: true,
            message: 'Email verified successfully'
        });  
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/users/me/applications
// Get current user's applications
router.get('/me/applications', auth, requireRole(['job_seeker']), async (req, res) => {
    try {
        const applications = await req.user.getApplications();
        
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

// @route   GET /api/users/me/saved-jobs
// Get current user's saved jobs
router.get('/me/saved-jobs', auth, requireRole(['job_seeker']), async (req, res) => {
    try {
        const savedJobs = await req.user.getSavedJobs();
        
        res.json({
            success: true,
            data: savedJobs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/users
// Get all users with pagination
router.get('/', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { page = 1, limit = 10, userType } = req.query;
        
        const users = await User.findAll(
            parseInt(page), 
            parseInt(limit), 
            userType
        );
        
        res.json({
            success: true,
            data: users.map(user => user.toJSON()),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/users/:id
// Get user by ID
router.get('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: user.toJSON()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/users/:id/applications
// Get user's applications (Admin view)
router.get('/:id/applications', auth, requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const applications = await user.getApplications();
        
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

// @route   PUT /api/users/:id
// Update user by ID (Admin)
router.put('/:id', auth, requireRole(['admin']), validateUserProfile, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const updatedUser = await user.update(req.body);
        
        res.json({
            success: true,
            data: updatedUser.toJSON(),
            message: 'User updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/users/me
// Delete current user account
router.delete('/me', auth, async (req, res) => {
    try {
        await req.user.delete();
        
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/users/:id
// Delete user by ID (Admin)
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        await user.delete();
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/users/refresh-token
// Refresh JWT token
router.post('/refresh-token', auth, async (req, res) => {
    try {
        const token = req.user.generateToken();
        
        res.json({
            success: true,
            data: { token },
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;