// models/Company.js
const db = require('../config/database');

class Company {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.companyName = data.company_name;
    this.description = data.description;
    this.industry = data.industry;
    this.companySize = data.company_size;
    this.website = data.website;
    this.logo = data.logo;
    this.address = data.address;
    this.city = data.city;
    this.country = data.country;
    this.foundedYear = data.founded_year;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new company
  static async create(companyData) {
    const { 
      userId, companyName, description, industry, companySize, 
      website, logo, address, city, country, foundedYear 
    } = companyData;
    
    const query = `
      INSERT INTO companies (
        user_id, company_name, description, industry, company_size,
        website, logo, address, city, country, founded_year
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await db.execute(query, [
        userId, companyName, description, industry, companySize,
        website, logo, address, city, country, foundedYear
      ]);
      
      return await Company.findById(result.insertId);
    } catch (error) {
      throw new Error('Error creating company: ' + error.message);
    }
  }

  // Find company by ID
  static async findById(id) {
    const query = 'SELECT * FROM companies WHERE id = ?';
    
    try {
      const [rows] = await db.execute(query, [id]);
      return rows.length > 0 ? new Company(rows[0]) : null;
    } catch (error) {
      throw new Error('Error finding company: ' + error.message);
    }
  }

  // Find company by user ID
  static async findByUserId(userId) {
    const query = 'SELECT * FROM companies WHERE user_id = ?';
    
    try {
      const [rows] = await db.execute(query, [userId]);
      return rows.length > 0 ? new Company(rows[0]) : null;
    } catch (error) {
      throw new Error('Error finding company: ' + error.message);
    }
  }

  // Get all companies with pagination and search
  static async findAll(page = 1, limit = 10, searchTerm = null, industry = null, companySize = null) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params = [];
    
    if (searchTerm) {
      query += ' AND (company_name LIKE ? OR description LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    if (industry) {
      query += ' AND industry = ?';
      params.push(industry);
    }
    
    if (companySize) {
      query += ' AND company_size = ?';
      params.push(companySize);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => new Company(row));
    } catch (error) {
      throw new Error('Error fetching companies: ' + error.message);
    }
  }

  // Get total count for pagination
  static async getCount(searchTerm = null, industry = null, companySize = null) {
    let query = 'SELECT COUNT(*) as count FROM companies WHERE 1=1';
    const params = [];
    
    if (searchTerm) {
      query += ' AND (company_name LIKE ? OR description LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    if (industry) {
      query += ' AND industry = ?';
      params.push(industry);
    }
    
    if (companySize) {
      query += ' AND company_size = ?';
      params.push(companySize);
    }
    
    try {
      const [rows] = await db.execute(query, params);
      return rows[0].count;
    } catch (error) {
      throw new Error('Error counting companies: ' + error.message);
    }
  }

  // Update company
  async update(updateData) {
    const allowedFields = [
      'company_name', 'description', 'industry', 'company_size',
      'website', 'logo', 'address', 'city', 'country', 'founded_year'
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
    const query = `UPDATE companies SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    try {
      await db.execute(query, values);
      return await Company.findById(this.id);
    } catch (error) {
      throw new Error('Error updating company: ' + error.message);
    }
  }

  // Delete company
  async delete() {
    const query = 'DELETE FROM companies WHERE id = ?';
    
    try {
      await db.execute(query, [this.id]);
      return true;
    } catch (error) {
      throw new Error('Error deleting company: ' + error.message);
    }
  }

  // Get company's job offers
  async getJobOffers(status = 'active') {
    let query = `
      SELECT jo.*, jc.category_name,
             COUNT(a.id) as application_count
      FROM job_offers jo
      LEFT JOIN job_categories jc ON jo.category_id = jc.id
      LEFT JOIN applications a ON jo.id = a.job_offer_id
      WHERE jo.company_id = ?
    `;
    
    if (status === 'active') {
      query += ' AND jo.is_active = TRUE';
    }
    
    query += ' GROUP BY jo.id ORDER BY jo.created_at DESC';
    
    try {
      const [rows] = await db.execute(query, [this.id]);
      return rows;
    } catch (error) {
      throw new Error('Error fetching job offers: ' + error.message);
    }
  }

  // Get company statistics
  async getStatistics() {
    const queries = {
      totalJobs: 'SELECT COUNT(*) as count FROM job_offers WHERE company_id = ?',
      activeJobs: 'SELECT COUNT(*) as count FROM job_offers WHERE company_id = ? AND is_active = TRUE',
      totalApplications: `
        SELECT COUNT(*) as count FROM applications a 
        JOIN job_offers jo ON a.job_offer_id = jo.id 
        WHERE jo.company_id = ?
      `,
      pendingApplications: `
        SELECT COUNT(*) as count FROM applications a 
        JOIN job_offers jo ON a.job_offer_id = jo.id 
        WHERE jo.company_id = ? AND a.status = 'pending'
      `
    };
    
    try {
      const results = {};
      
      for (const [key, query] of Object.entries(queries)) {
        const [rows] = await db.execute(query, [this.id]);
        results[key] = rows[0].count;
      }
      
      return results;
    } catch (error) {
      throw new Error('Error fetching company statistics: ' + error.message);
    }
  }

  // Get recent applications for company's jobs
  async getRecentApplications(limit = 10) {
    const query = `
      SELECT a.*, jo.title as job_title, u.first_name, u.last_name, u.email
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN users u ON a.user_id = u.id
      WHERE jo.company_id = ?
      ORDER BY a.applied_at DESC
      LIMIT ?
    `;
    
    try {
      const [rows] = await db.execute(query, [this.id, limit]);
      return rows;
    } catch (error) {
      throw new Error('Error fetching recent applications: ' + error.message);
    }
  }

  // Get company with user details
  async getWithUserDetails() {
    const query = `
      SELECT c.*, u.email, u.first_name, u.last_name, u.phone
      FROM companies c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `;
    
    try {
      const [rows] = await db.execute(query, [this.id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error('Error fetching company with user details: ' + error.message);
    }
  }

  // Search companies by name or industry
  static async search(searchTerm, limit = 10) {
    const query = `
      SELECT * FROM companies 
      WHERE company_name LIKE ? OR industry LIKE ? OR description LIKE ?
      ORDER BY company_name ASC
      LIMIT ?
    `;
    
    try {
      const searchPattern = `%${searchTerm}%`;
      const [rows] = await db.execute(query, [searchPattern, searchPattern, searchPattern, limit]);
      return rows.map(row => new Company(row));
    } catch (error) {
      throw new Error('Error searching companies: ' + error.message);
    }
  }

  // Get unique industries
  static async getIndustries() {
    const query = 'SELECT DISTINCT industry FROM companies WHERE industry IS NOT NULL ORDER BY industry ASC';
    
    try {
      const [rows] = await db.execute(query);
      return rows.map(row => row.industry);
    } catch (error) {
      throw new Error('Error fetching industries: ' + error.message);
    }
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      companyName: this.companyName,
      description: this.description,
      industry: this.industry,
      companySize: this.companySize,
      website: this.website,
      logo: this.logo,
      address: this.address,
      city: this.city,
      country: this.country,
      foundedYear: this.foundedYear,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Company;