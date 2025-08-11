// middleware/validation.js
const { body, validationResult } = require('express-validator');

// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Job Offer validation
const validateJobOffer = [
    body('title')
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Title must be between 3 and 100 characters'),
    
    body('description')
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 50, max: 5000 })
        .withMessage('Description must be between 50 and 5000 characters'),
    
    body('requirements')
        .notEmpty()
        .withMessage('Requirements are required')
        .isLength({ min: 20, max: 2000 })
        .withMessage('Requirements must be between 20 and 2000 characters'),
    
    body('jobType')
        .isIn(['full_time', 'part_time', 'contract', 'freelance', 'internship'])
        .withMessage('Invalid job type'),
    
    body('experienceLevel')
        .isIn(['entry', 'mid', 'senior', 'executive'])
        .withMessage('Invalid experience level'),
    
    body('location')
        .notEmpty()
        .withMessage('Location is required')
        .isLength({ max: 100 })
        .withMessage('Location must not exceed 100 characters'),
    
    body('isRemote')
        .isBoolean()
        .withMessage('isRemote must be a boolean value'),
    
    body('salaryMin')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Minimum salary must be a positive number'),
    
    body('salaryMax')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Maximum salary must be a positive number')
        .custom((value, { req }) => {
            if (req.body.salaryMin && value < req.body.salaryMin) {
                throw new Error('Maximum salary must be greater than minimum salary');
            }
            return true;
        }),
    
    body('categoryId')
        .notEmpty()
        .withMessage('Category is required')
        .isInt()
        .withMessage('Category ID must be a number'),
    
    body('expirationDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiration date format')
        .custom(value => {
            if (new Date(value) <= new Date()) {
                throw new Error('Expiration date must be in the future');
            }
            return true;
        }),
    
    body('skills')
        .optional()
        .isArray()
        .withMessage('Skills must be an array'),
    
    body('benefits')
        .optional()
        .isArray()
        .withMessage('Benefits must be an array'),
    
    handleValidationErrors
];

// Company validation
const validateCompany = [
    body('name')
        .notEmpty()
        .withMessage('Company name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Company name must be between 2 and 100 characters'),
    
    body('description')
        .notEmpty()
        .withMessage('Company description is required')
        .isLength({ min: 50, max: 2000 })
        .withMessage('Description must be between 50 and 2000 characters'),
    
    body('industry')
        .notEmpty()
        .withMessage('Industry is required')
        .isLength({ max: 50 })
        .withMessage('Industry must not exceed 50 characters'),
    
    body('companySize')
        .isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
        .withMessage('Invalid company size'),
    
    body('location')
        .notEmpty()
        .withMessage('Location is required')
        .isLength({ max: 100 })
        .withMessage('Location must not exceed 100 characters'),
    
    body('website')
        .optional()
        .isURL()
        .withMessage('Invalid website URL'),
    
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Invalid phone number format'),
    
    body('logo')
        .optional()
        .isURL()
        .withMessage('Logo must be a valid URL'),
    
    body('foundedYear')
        .optional()
        .isInt({ min: 1800, max: new Date().getFullYear() })
        .withMessage('Founded year must be between 1800 and current year'),
    
    handleValidationErrors
];

// Application validation
/*
const validateApplication = [
    body('jobOfferId')
        .notEmpty()
        .withMessage('Job offer ID is required')
        .isInt()
        .withMessage('Job offer ID must be a number'),
    
    body('coverLetter')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Cover letter must not exceed 2000 characters'),
    
    body('resumeUrl')
        .optional()
        .isURL()
        .withMessage('Resume URL must be valid'),
    
    body('portfolioUrl')
        .optional()
        .isURL()
        .withMessage('Portfolio URL must be valid'),
    
    body('expectedSalary')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Expected salary must be a positive number'),
    
    body('availabilityDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid availability date format'),
    
    body('additionalInfo')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Additional info must not exceed 1000 characters'),
    
    handleValidationErrors
];*/

const validateApplication = [
    body('jobOfferId')
        .notEmpty()
        .withMessage('Job offer ID is required')
        .isInt()
        .withMessage('Job offer ID must be a number'),
    
    body('coverLetter')
        .notEmpty()
        .withMessage('Cover letter is required')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Cover letter must be between 10 and 2000 characters'),
    
    body('resumeUrl')
        .notEmpty()
        .withMessage('Resume URL is required')
        .isURL()
        .withMessage('Resume URL must be valid'),
    
    handleValidationErrors
];

// User registration validation
const validateUserRegistration = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('firstName')
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    
    body('lastName')
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    
    body()
        .custom((value, { req }) => {
            const userType = req.body.userType || req.body.role;
            if (!userType) {
                throw new Error('User type is required');
            }
            if (!['job_seeker', 'company', 'admin'].includes(userType)) {
                throw new Error('Invalid user type');
            }
            // Normalize the field name to userType
            req.body.userType = userType;
            delete req.body.role; // Remove role field if it exists
            return true;
        }),
        
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Invalid phone number format'),
    
    handleValidationErrors
];

// User profile update validation
const validateUserProfile = [
    body('firstName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    
    body('lastName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Invalid phone number format'),
    
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Bio must not exceed 500 characters'),
    
    body('location')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Location must not exceed 100 characters'),
    
    body('website')
        .optional()
        .isURL()
        .withMessage('Invalid website URL'),
    
    handleValidationErrors
];

// Login validation
const validateLogin = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    
    handleValidationErrors
];

// New password validation (for reset password)
const validateNewPassword = [
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match password');
            }
            return true;
        }),
    
    handleValidationErrors
];

// Password change validation (for changing existing password)
const validatePasswordChange = [
    body('oldPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
        .custom((value, { req }) => {
            if (value === req.body.oldPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),
    
    handleValidationErrors
];

module.exports = {
    validateJobOffer,
    validateCompany,
    validateApplication,
    validateUserRegistration,
    validateUserProfile,
    validateLogin,
    validatePasswordReset,
    validateNewPassword,
    validatePasswordChange,
    handleValidationErrors
};