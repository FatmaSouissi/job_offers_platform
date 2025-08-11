// models/Application.js
const db = require('../config/database');

class Application {
  constructor(data) {
    this.id = data.id;
    this.jobOfferId = data.job_offer_id;
    this.userId = data.user_id;
    this.coverLetter = data.cover_letter;
    this.resumeUrl = data.resume_url;
    this.status = data.status;
    this.appliedAt = data.applied_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new application
  static async create(applicationData) {
    const { jobOfferId, userId, coverLetter, resumeUrl } = applicationData;
    
    // Check if user has already applied for this job
    const existingApplication = await Application.findByJobAndUser(jobOfferId, userId);
    if (existingApplication) {
      throw new Error('You have already applied for this job');
    }
    
    const query = `
      INSERT INTO applications (job_offer_id, user_id, cover_letter, resume_url)
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const [result] = await db.execute(query, [
        jobOfferId, userId, coverLetter, resumeUrl
      ]);
      
      return await Application.findById(result.insertId);
    } catch (error) {
      throw new Error('Error creating application: ' + error.message);
    }
  }

  // Find application by ID
  static async findById(id) {
    const query = 'SELECT * FROM applications WHERE id = ?';
    
    try {
      const [rows] = await db.execute(query, [id]);
      return rows.length > 0 ? new Application(rows[0]) : null;
    } catch (error) {
      throw new Error('Error finding application: ' + error.message);
    }
  }

  // Find application by job and user
  static async findByJobAndUser(jobOfferId, userId) {
    const query = 'SELECT * FROM applications WHERE job_offer_id = ? AND user_id = ?';
    
    try {
      const [rows] = await db.execute(query, [jobOfferId, userId]);
      return rows.length > 0 ? new Application(rows[0]) : null;
    } catch (error) {
      throw new Error('Error finding application: ' + error.message);
    }
  }

  // Get all applications with filters and pagination
  static async findAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      userId = null,
      jobOfferId = null,
      companyId = null,
      status = null,
      sortBy = 'applied_at',
      sortOrder = 'DESC'
    } = filters;
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, 
             jo.title as job_title, jo.job_type, jo.experience_level,
             c.company_name, c.logo,
             u.first_name, u.last_name, u.email, u.phone,
             jsp.resume_url as profile_resume_url
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN companies c ON jo.company_id = c.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
      WHERE 1=1
    `;
    const params = [];
    
    if (userId) {
      query += ' AND a.user_id = ?';
      params.push(userId);
    }
    
    if (jobOfferId) {
      query += ' AND a.job_offer_id = ?';
      params.push(jobOfferId);
    }
    
    if (companyId) {
      query += ' AND jo.company_id = ?';
      params.push(companyId);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ` ORDER BY a.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => ({
        ...new Application(row),
        job: {
          title: row.job_title,
          jobType: row.job_type,
          experienceLevel: row.experience_level
        },
        company: {
          name: row.company_name,
          logo: row.logo
        },
        applicant: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          profileResumeUrl: row.profile_resume_url
        }
      }));
    } catch (error) {
      throw new Error('Error fetching applications: ' + error.message);
    }
  }

  // Get total count for pagination
  static async getCount(filters = {}) {
    const {
      userId = null,
      jobOfferId = null,
      companyId = null,
      status = null
    } = filters;
    
    let query = `
      SELECT COUNT(*) as count
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      WHERE 1=1
    `;
    const params = [];
    
    if (userId) {
      query += ' AND a.user_id = ?';
      params.push(userId);
    }
    
    if (jobOfferId) {
      query += ' AND a.job_offer_id = ?';
      params.push(jobOfferId);
    }
    
    if (companyId) {
      query += ' AND jo.company_id = ?';
      params.push(companyId);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    try {
      const [rows] = await db.execute(query, params);
      return rows[0].count;
    } catch (error) {
      throw new Error('Error counting applications: ' + error.message);
    }
  }

  // Get application with complete details
  static async findByIdWithDetails(id) {
    const query = `
      SELECT a.*, 
             jo.title as job_title, jo.description as job_description,
             jo.job_type, jo.experience_level, jo.salary_min, jo.salary_max,
             jo.location, jo.is_remote,
             c.company_name, c.logo, c.description as company_description,
             c.industry, c.website,
             u.first_name, u.last_name, u.email, u.phone,
             jsp.resume_url as profile_resume_url, jsp.bio, jsp.skills,
             jsp.experience_years, jsp.linkedin_url, jsp.portfolio_url
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN companies c ON jo.company_id = c.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
      WHERE a.id = ?
    `;
    
    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        ...new Application(row),
        job: {
          title: row.job_title,
          description: row.job_description,
          jobType: row.job_type,
          experienceLevel: row.experience_level,
          salaryMin: row.salary_min,
          salaryMax: row.salary_max,
          location: row.location,
          isRemote: row.is_remote
        },
        company: {
          name: row.company_name,
          logo: row.logo,
          description: row.company_description,
          industry: row.industry,
          website: row.website
        },
        applicant: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          profileResumeUrl: row.profile_resume_url,
          bio: row.bio,
          skills: row.skills ? JSON.parse(row.skills) : [],
          experienceYears: row.experience_years,
          linkedinUrl: row.linkedin_url,
          portfolioUrl: row.portfolio_url
        }
      };
    } catch (error) {
      throw new Error('Error fetching application details: ' + error.message);
    }
  }

  // Update application status
  async updateStatus(newStatus, updatedBy = null) {
    const validStatuses = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status. Must be one of: ' + validStatuses.join(', '));
    }
    
    const query = 'UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    try {
      await db.execute(query, [newStatus, this.id]);
      this.status = newStatus;
      
      // Create notification for status change
      if (updatedBy) {
        await this.createStatusNotification(newStatus, updatedBy);
      }
      
      return this;
    } catch (error) {
      throw new Error('Error updating application status: ' + error.message);
    }
  }

  // Create notification for status change
  async createStatusNotification(status, updatedBy) {
    const statusMessages = {
      reviewed: 'Your application has been reviewed',
      interview: 'You have been invited for an interview',
      accepted: 'Congratulations! Your application has been accepted',
      rejected: 'Your application has been rejected'
    };
    
    const message = statusMessages[status];
    if (!message) return;
    
    const query = `
      INSERT INTO notifications (user_id, title, message, notification_type)
      VALUES (?, ?, ?, 'application_status')
    `;
    
    try {
      await db.execute(query, [this.userId, 'Application Status Update', message]);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Update application details
  async update(updateData) {
    const allowedFields = ['cover_letter', 'resume_url'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(this.id);
    const query = `UPDATE applications SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    try {
      await db.execute(query, values);
      return await Application.findById(this.id);
    } catch (error) {
      throw new Error('Error updating application: ' + error.message);
    }
  }

  // Delete application
  async delete() {
    const query = 'DELETE FROM applications WHERE id = ?';
    
    try {
      await db.execute(query, [this.id]);
      return true;
    } catch (error) {
      throw new Error('Error deleting application: ' + error.message);
    }
  }

  // Get applications by user
  static async getByUser(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT a.*, 
             jo.title as job_title, jo.job_type, jo.location, jo.is_remote,
             c.company_name, c.logo
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN companies c ON jo.company_id = c.id
      WHERE a.user_id = ?
      ORDER BY a.applied_at DESC
      LIMIT ? OFFSET ?
    `;
    
    try {
      const [rows] = await db.execute(query, [userId, limit, offset]);
      return rows.map(row => ({
        ...new Application(row),
        job: {
          title: row.job_title,
          jobType: row.job_type,
          location: row.location,
          isRemote: row.is_remote
        },
        company: {
          name: row.company_name,
          logo: row.logo
        }
      }));
    } catch (error) {
      throw new Error('Error fetching user applications: ' + error.message);
    }
  }

  // Get applications by job offer
  static async getByJobOffer(jobOfferId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT a.*, 
             u.first_name, u.last_name, u.email, u.phone,
             jsp.resume_url as profile_resume_url, jsp.bio, jsp.skills,
             jsp.experience_years
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
      WHERE a.job_offer_id = ?
      ORDER BY a.applied_at DESC
      LIMIT ? OFFSET ?
    `;
    
    try {
      const [rows] = await db.execute(query, [jobOfferId, limit, offset]);
      return rows.map(row => ({
        ...new Application(row),
        applicant: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          profileResumeUrl: row.profile_resume_url,
          bio: row.bio,
          skills: row.skills ? JSON.parse(row.skills) : [],
          experienceYears: row.experience_years
        }
      }));
    } catch (error) {
      throw new Error('Error fetching job applications: ' + error.message);
    }
  }

  // Get applications by company
  static async getByCompany(companyId, page = 1, limit = 10, status = null) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, 
             jo.title as job_title,
             u.first_name, u.last_name, u.email, u.phone,
             jsp.resume_url as profile_resume_url, jsp.experience_years
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
      WHERE jo.company_id = ?
    `;
    const params = [companyId];
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY a.applied_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => ({
        ...new Application(row),
        job: {
          title: row.job_title
        },
        applicant: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          profileResumeUrl: row.profile_resume_url,
          experienceYears: row.experience_years
        }
      }));
    } catch (error) {
      throw new Error('Error fetching company applications: ' + error.message);
    }
  }

  // Get application statistics
  static async getStatistics(companyId = null, userId = null) {
    let baseQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM applications a
    `;
    
    const params = [];
    
    if (companyId) {
      baseQuery += `
        JOIN job_offers jo ON a.job_offer_id = jo.id
        WHERE jo.company_id = ?
      `;
      params.push(companyId);
    } else if (userId) {
      baseQuery += ' WHERE a.user_id = ?';
      params.push(userId);
    }
    
    try {
      const [rows] = await db.execute(baseQuery, params);
      return rows[0];
    } catch (error) {
      throw new Error('Error fetching application statistics: ' + error.message);
    }
  }

  // Get recent applications
  static async getRecent(limit = 10, companyId = null) {
    let query = `
      SELECT a.*, 
             jo.title as job_title,
             c.company_name,
             u.first_name, u.last_name, u.email
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN companies c ON jo.company_id = c.id
      JOIN users u ON a.user_id = u.id
    `;
    
    const params = [];
    
    if (companyId) {
      query += ' WHERE jo.company_id = ?';
      params.push(companyId);
    }
    
    query += ' ORDER BY a.applied_at DESC LIMIT ?';
    params.push(limit);
    
    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => ({
        ...new Application(row),
        job: {
          title: row.job_title
        },
        company: {
          name: row.company_name
        },
        applicant: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        }
      }));
    } catch (error) {
      throw new Error('Error fetching recent applications: ' + error.message);
    }
  }

  // Get applications with date range
  static async getByDateRange(startDate, endDate, filters = {}) {
    const {
      companyId = null,
      userId = null,
      status = null,
      page = 1,
      limit = 10
    } = filters;
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, 
             jo.title as job_title,
             c.company_name,
             u.first_name, u.last_name, u.email
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN companies c ON jo.company_id = c.id
      JOIN users u ON a.user_id = u.id
      WHERE a.applied_at BETWEEN ? AND ?
    `;
    
    const params = [startDate, endDate];
    
    if (companyId) {
      query += ' AND jo.company_id = ?';
      params.push(companyId);
    }
    
    if (userId) {
      query += ' AND a.user_id = ?';
      params.push(userId);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY a.applied_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => ({
        ...new Application(row),
        job: {
          title: row.job_title
        },
        company: {
          name: row.company_name
        },
        applicant: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email
        }
      }));
    } catch (error) {
      throw new Error('Error fetching applications by date range: ' + error.message);
    }
  }

  // Get application trends (monthly statistics)
  static async getTrends(companyId = null, months = 6) {
    let query = `
      SELECT 
        DATE_FORMAT(applied_at, '%Y-%m') as month,
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM applications a
    `;
    
    const params = [];
    
    if (companyId) {
      query += `
        JOIN job_offers jo ON a.job_offer_id = jo.id
        WHERE jo.company_id = ? AND
      `;
      params.push(companyId);
    } else {
      query += ' WHERE ';
    }
    
    query += `
      applied_at >= DATE_SUB(CURRENT_DATE, INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(applied_at, '%Y-%m')
      ORDER BY month DESC
    `;
    params.push(months);
    
    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error('Error fetching application trends: ' + error.message);
    }
  }

  // Check if user can apply to job
  static async canUserApply(userId, jobOfferId) {
    const existingApplication = await Application.findByJobAndUser(jobOfferId, userId);
    return !existingApplication;
  }

  // Get application count by status for a specific job
  static async getJobApplicationStats(jobOfferId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM applications 
      WHERE job_offer_id = ?
    `;
    
    try {
      const [rows] = await db.execute(query, [jobOfferId]);
      return rows[0];
    } catch (error) {
      throw new Error('Error fetching job application stats: ' + error.message);
    }
  }

  // Bulk update application statuses
  static async bulkUpdateStatus(applicationIds, newStatus, updatedBy = null) {
    const validStatuses = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status. Must be one of: ' + validStatuses.join(', '));
    }
    
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new Error('Invalid application IDs');
    }
    
    const placeholders = applicationIds.map(() => '?').join(',');
    const query = `
      UPDATE applications 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `;
    
    try {
      await db.execute(query, [newStatus, ...applicationIds]);
      
      // Create notifications for each application
      if (updatedBy) {
        for (const appId of applicationIds) {
          const app = await Application.findById(appId);
          if (app) {
            await app.createStatusNotification(newStatus, updatedBy);
          }
        }
      }
      
      return true;
    } catch (error) {
      throw new Error('Error bulk updating applications: ' + error.message);
    }
  }
}

module.exports = Application;