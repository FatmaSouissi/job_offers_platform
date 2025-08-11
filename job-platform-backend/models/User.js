// models/User.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.phone = data.phone;
    this.userType = data.user_type;
    this.profilePicture = data.profile_picture;
    this.isActive = data.is_active;
    this.emailVerified = data.email_verified;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Create a new user
  static async create(userData) {
    const { email, password, firstName, lastName, phone, userType } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
     
    const query = `
      INSERT INTO users (email, password, first_name, last_name, phone, user_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await db.execute(query, [
        email, hashedPassword, firstName, lastName, phone, userType
      ]);
      
      return await User.findById(result.insertId);
    } catch (error) {
      throw new Error('Error creating user: ' + error.message);
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ? AND is_active = TRUE';
    
    try {
      const [rows] = await db.execute(query, [id]);
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw new Error('Error finding user: ' + error.message);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = TRUE';
    
    try {
      const [rows] = await db.execute(query, [email]);
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw new Error('Error finding user: ' + error.message);
    }
  }

  // Get all users with pagination
  static async findAll(page = 1, limit = 10, userType = null) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM users WHERE is_active = TRUE';
    const params = [];
    
    if (userType) {
      query += ' AND user_type = ?';
      params.push(userType);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    try {
      const [rows] = await db.execute(query, params);
      return rows.map(row => new User(row));
    } catch (error) {
      throw new Error('Error fetching users: ' + error.message);
    }
  }

  // Update user
  async update(updateData) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'profile_picture'];
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
    const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    try {
      await db.execute(query, values);
      return await User.findById(this.id);
    } catch (error) {
      throw new Error('Error updating user: ' + error.message);
    }
  }

  // Change password
  async changePassword(oldPassword, newPassword) {
    const isValid = await bcrypt.compare(oldPassword, this.password);
    if (!isValid) {
      throw new Error('Invalid old password');
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    try {
      await db.execute(query, [hashedNewPassword, this.id]);
      return true;
    } catch (error) {
      throw new Error('Error changing password: ' + error.message);
    }
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Generate JWT token
 generateToken() {
    // Check if JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    return jwt.sign(
      { 
        id: this.id, 
        email: this.email, 
        userType: this.userType 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
      }
    );
  }

  // Static method to verify JWT token
  static verifyToken(token) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  }

  // Verify email
  async verifyEmail() {
    const query = 'UPDATE users SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    try {
      await db.execute(query, [this.id]);
      this.emailVerified = true;
      return true;
    } catch (error) {
      throw new Error('Error verifying email: ' + error.message);
    }
  }

  // Soft delete user
  async delete() {
    const query = 'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    try {
      await db.execute(query, [this.id]);
      return true;
    } catch (error) {
      throw new Error('Error deleting user: ' + error.message);
    }
  }

  // Get user's applications
  async getApplications() {
    const query = `
      SELECT a.*, jo.title as job_title, c.company_name
      FROM applications a
      JOIN job_offers jo ON a.job_offer_id = jo.id
      JOIN companies c ON jo.company_id = c.id
      WHERE a.user_id = ?
      ORDER BY a.applied_at DESC
    `;
    
    try {
      const [rows] = await db.execute(query, [this.id]);
      return rows;
    } catch (error) {
      throw new Error('Error fetching applications: ' + error.message);
    }
  }

  // Get user's saved jobs
  async getSavedJobs() {
    const query = `
      SELECT sj.*, jo.title, jo.description, jo.salary_min, jo.salary_max, 
             jo.location, jo.is_remote, c.company_name
      FROM saved_jobs sj
      JOIN job_offers jo ON sj.job_offer_id = jo.id
      JOIN companies c ON jo.company_id = c.id
      WHERE sj.user_id = ? AND jo.is_active = TRUE
      ORDER BY sj.saved_at DESC
    `;
    
    try {
      const [rows] = await db.execute(query, [this.id]);
      return rows;
    } catch (error) {
      throw new Error('Error fetching saved jobs: ' + error.message);
    }
  }

  // Convert to JSON (exclude sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      userType: this.userType,
      profilePicture: this.profilePicture,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;