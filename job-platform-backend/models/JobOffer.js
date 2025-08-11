// models/JobOffer.js
const db = require('../config/database');

class JobOffer {
  constructor(data) {
    this.id = data.id;
    this.companyId = data.company_id;
    this.title = data.title;
    this.description = data.description;
    this.requirements = data.requirements;
    this.responsibilities = data.responsibilities;
    this.jobType = data.job_type;
    this.experienceLevel = data.experience_level;
    this.salaryMin = data.salary_min;
    this.salaryMax = data.salary_max;
    this.salaryCurrency = data.salary_currency;
    this.location = data.location;
    this.isRemote = data.is_remote;
    this.categoryId = data.category_id;
    this.applicationDeadline = data.application_deadline;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new job offer
  static async create(jobData) {
    const { 
      companyId, title, description, requirements, responsibilities,
      jobType, experienceLevel, salaryMin, salaryMax, salaryCurrency,
      location, isRemote, categoryId, applicationDeadline 
    } = jobData;
    
    const query = `
      INSERT INTO job_offers (
        company_id, title, description, requirements, responsibilities,
        job_type, experience_level, salary_min, salary_max, salary_currency,
        location, is_remote, category_id, application_deadline
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await db.execute(query, [
        companyId, title, description, requirements, responsibilities,
        jobType, experienceLevel, salaryMin, salaryMax, salaryCurrency,
        location, isRemote, categoryId, applicationDeadline
      ]);
      
      return await JobOffer.findById(result.insertId);
    } catch (error) {
      throw new Error('Error creating job offer: ' + error.message);
    }
  }
/*
static async findAll() {
  console.log('=== SUPER SIMPLE findAll ===');
  
  try {
    // Just get the raw data from job_offers table
    const query = 'SELECT * FROM job_offers ';
    console.log('Executing query:', query);
    
    const [rows] = await db.execute(query);
    console.log('Raw database result:', rows);
    console.log('Number of rows:', rows.length);
    
    if (rows.length === 0) {
      console.log('No rows found - table might be empty');
      return [];
    }
    
    // Don't use JobOffer constructor yet, just return raw data
    const result = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      companyId: row.company_id,
      isActive: row.is_active,
      createdAt: row.created_at
    }));
    
    console.log('Processed result:', result);
    return result;
    
  } catch (error) {
    console.error('Error in super simple findAll:', error);
    throw error;
  }
}
*/
/*
static async getCount() {
  console.log('=== SUPER SIMPLE getCount ===');
  
  try {
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM job_offers');
    console.log('Count result:', rows[0].count);
    return rows[0].count;
  } catch (error) {
    console.error('Error in getCount:', error);
    throw error;
  }
}*/


  // Find job offer by ID
  static async findById(id) {
    const query = 'SELECT * FROM job_offers WHERE id = ?';
    
    try {
      const [rows] = await db.execute(query, [id]);
      return rows.length > 0 ? new JobOffer(rows[0]) : null;
    } catch (error) {
      throw new Error('Error finding job offer: ' + error.message);
    }
  }


 // Get all job offers without any filters or pagination
static async findAll() {
  console.log('=== Finding ALL job offers ===');

  const query = `
    SELECT jo.*, c.company_name, c.logo, jc.category_name,
           COUNT(a.id) as application_count
    FROM job_offers jo
    LEFT JOIN companies c ON jo.company_id = c.id
    LEFT JOIN job_categories jc ON jo.category_id = jc.id
    LEFT JOIN applications a ON jo.id = a.job_offer_id
    GROUP BY jo.id
    ORDER BY jo.created_at DESC
  `;

  try {
    const [rows] = await db.execute(query);
    console.log('Found jobs:', rows.length);
    return rows.map(row => ({
      ...new JobOffer(row),
      companyName: row.company_name,
      companyLogo: row.logo,
      categoryName: row.category_name,
      applicationCount: row.application_count
    }));
  } catch (error) {
    console.error('Error fetching all job offers:', error);
    throw new Error('Error fetching all job offers: ' + error.message);
  }
}


  // Get total count for pagination
  static async getCount(filters = {}) {
    const {
      searchTerm = null,
      jobType = null,
      experienceLevel = null,
      categoryId = null,
      location = null,
      isRemote = null,
      salaryMin = null,
      salaryMax = null,
      companyId = null,
      isActive = 1 // Changed default value from true to 1
    } = filters;
    
    let query = `
      SELECT COUNT(DISTINCT jo.id) as count
      FROM job_offers jo
      LEFT JOIN companies c ON jo.company_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (isActive !== null) {
      query += ' AND jo.is_active = ?';
      params.push(isActive);
    }
    
    if (searchTerm) {
      query += ' AND (jo.title LIKE ? OR jo.description LIKE ? OR c.company_name LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    if (jobType) {
      query += ' AND jo.job_type = ?';
      params.push(jobType);
    }
    
    if (experienceLevel) {
      query += ' AND jo.experience_level = ?';
      params.push(experienceLevel);
    }
    
    if (categoryId) {
      query += ' AND jo.category_id = ?';
      params.push(categoryId);
    }
    
    if (location) {
      query += ' AND jo.location LIKE ?';
      params.push(`%${location}%`);
    }
    
    if (isRemote !== null) {
      query += ' AND jo.is_remote = ?';
      params.push(isRemote);
    }
    
    if (salaryMin) {
      query += ' AND jo.salary_max >= ?';
      params.push(salaryMin);
    }
    
    if (salaryMax) {
      query += ' AND jo.salary_min <= ?';
      params.push(salaryMax);
    }
    
    if (companyId) {
      query += ' AND jo.company_id = ?';
      params.push(companyId);
    }
    
    try {
      const [rows] = await db.execute(query, params);
      return rows[0].count;
    } catch (error) {
      throw new Error('Error counting job offers: ' + error.message);
    }
  }

  // Get job offer with complete details
  static async findByIdWithDetails(id) {
    const query = `
      SELECT jo.*, c.company_name, c.logo, c.description as company_description,
             c.industry, c.company_size, c.website, c.city, c.country,
             jc.category_name, u.first_name, u.last_name, u.email as company_email,
             COUNT(a.id) as application_count
      FROM job_offers jo
      LEFT JOIN companies c ON jo.company_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN job_categories jc ON jo.category_id = jc.id
      LEFT JOIN applications a ON jo.id = a.job_offer_id
      WHERE jo.id = ?
      GROUP BY jo.id
    `;
    
    try {
      const [rows] = await db.execute(query, [id]);
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        ...new JobOffer(row),
        company: {
          name: row.company_name,
          logo: row.logo,
          description: row.company_description,
          industry: row.industry,
          companySize: row.company_size,
          website: row.website,
          city: row.city,
          country: row.country,
          contactFirstName: row.first_name,
          contactLastName: row.last_name,
          contactEmail: row.company_email
        },
        categoryName: row.category_name,
        applicationCount: row.application_count
      };
    } catch (error) {
      throw new Error('Error fetching job offer details: ' + error.message);
    }
  }

  // Update job offer
  async update(updateData) {
    const allowedFields = [
      'title', 'description', 'requirements', 'responsibilities',
      'job_type', 'experience_level', 'salary_min', 'salary_max',
      'salary_currency', 'location', 'is_remote', 'category_id',
      'application_deadline', 'is_active'
    ];
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
    const query = `UPDATE job_offers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    try {
      await db.execute(query, values);
      return await JobOffer.findById(this.id);
    } catch (error) {
      throw new Error('Error updating job offer: ' + error.message);
    }
  }

  // Delete job offer
  async delete() {
    const query = 'DELETE FROM job_offers WHERE id = ?';
    
    try {
      await db.execute(query, [this.id]);
      return true;
    } catch (error) {
      throw new Error('Error deleting job offer: ' + error.message);
    }
  }

  // Deactivate job offer
  async deactivate() {
    const query = 'UPDATE job_offers SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    try {
      await db.execute(query, [this.id]);
      this.isActive = false;
      return true;
    } catch (error) {
      throw new Error('Error deactivating job offer: ' + error.message);
    }
  }

  // Get job applications
  async getApplications(status = null) {
    let query = `
      SELECT a.*, u.first_name, u.last_name, u.email, u.phone,
             jsp.resume_url, jsp.bio, jsp.skills, jsp.experience_years
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
      WHERE a.job_offer_id = ?
    `;
    const params = [this.id];
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY a.applied_at DESC';
    
    try {
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error('Error fetching applications: ' + error.message);
    }
  }

  // Get job skills
  async getSkills() {
    const query = 'SELECT * FROM job_skills WHERE job_offer_id = ? ORDER BY is_required DESC, skill_name ASC';
    
    try {
      const [rows] = await db.execute(query, [this.id]);
      return rows;
    } catch (error) {
      throw new Error('Error fetching job skills: ' + error.message);
    }
  }

  // Add skills to job offer
  async addSkills(skills) {
    if (!Array.isArray(skills) || skills.length === 0) {
      throw new Error('Skills must be a non-empty array');
    }
    
    // First, remove existing skills
    await db.execute('DELETE FROM job_skills WHERE job_offer_id = ?', [this.id]);
    
    // Then add new skills
    const query = 'INSERT INTO job_skills (job_offer_id, skill_name, is_required) VALUES ?';
    const values = skills.map(skill => [this.id, skill.name, skill.isRequired || false]);
    
    try {
      await db.query(query, [values]);
      return true;
    } catch (error) {
      throw new Error('Error adding skills: ' + error.message);
    }
  }

  // Check if user has applied
  async hasUserApplied(userId) {
    const query = 'SELECT COUNT(*) as count FROM applications WHERE job_offer_id = ? AND user_id = ?';
    
    try {
      const [rows] = await db.execute(query, [this.id, userId]);
      return rows[0].count > 0;
    } catch (error) {
      throw new Error('Error checking application status: ' + error.message);
    }
  }

  // Get similar job offers
  async getSimilarJobs(limit = 5) {
    const query = `
      SELECT jo.*, c.company_name, c.logo, jc.category_name
      FROM job_offers jo
      LEFT JOIN companies c ON jo.company_id = c.id
      LEFT JOIN job_categories jc ON jo.category_id = jc.id
      WHERE jo.id != ? AND jo.is_active = TRUE
      AND (jo.category_id = ? OR jo.job_type = ? OR jo.experience_level = ?)
      ORDER BY 
        CASE 
          WHEN jo.category_id = ? THEN 1
          WHEN jo.job_type = ? THEN 2
          WHEN jo.experience_level = ? THEN 3
          ELSE 4
        END,
        jo.created_at DESC
      LIMIT ?
    `;
    
    try {
      const [rows] = await db.execute(query, [
        this.id, this.categoryId, this.jobType, this.experienceLevel,
        this.categoryId, this.jobType, this.experienceLevel, limit
      ]);
      return rows;
    } catch (error) {
      throw new Error('Error fetching similar jobs: ' + error.message);
    }
  }

  // Get expired job offers
  static async getExpiredJobs() {
    const query = `
      SELECT * FROM job_offers 
      WHERE is_active = TRUE 
      AND application_deadline < CURDATE()
    `;
    
    try {
      const [rows] = await db.execute(query);
      return rows.map(row => new JobOffer(row));
    } catch (error) {
      throw new Error('Error fetching expired jobs: ' + error.message);
    }
  }

  // Get job statistics
  static async getStatistics() {
    const queries = {
      totalJobs: 'SELECT COUNT(*) as count FROM job_offers',
      activeJobs: 'SELECT COUNT(*) as count FROM job_offers WHERE is_active = TRUE',
      totalApplications: 'SELECT COUNT(*) as count FROM applications',
      jobsByType: `
        SELECT job_type, COUNT(*) as count 
        FROM job_offers 
        WHERE is_active = TRUE 
        GROUP BY job_type
      `,
      jobsByExperience: `
        SELECT experience_level, COUNT(*) as count 
        FROM job_offers 
        WHERE is_active = TRUE 
        GROUP BY experience_level
      `
    };
    
    try {
      const results = {};
      
      for (const [key, query] of Object.entries(queries)) {
        const [rows] = await db.execute(query);
        if (key === 'jobsByType' || key === 'jobsByExperience') {
          results[key] = rows;
        } else {
          results[key] = rows[0].count;
        }
      }
      
      return results;
    } catch (error) {
      throw new Error('Error fetching job statistics: ' + error.message);
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      companyId: this.companyId,
      title: this.title,
      description: this.description,
      requirements: this.requirements,
      responsibilities: this.responsibilities,
      jobType: this.jobType,
      experienceLevel: this.experienceLevel,
      salaryMin: this.salaryMin,
      salaryMax: this.salaryMax,
      salaryCurrency: this.salaryCurrency,
      location: this.location,
      isRemote: this.isRemote,
      categoryId: this.categoryId,
      applicationDeadline: this.applicationDeadline,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = JobOffer;