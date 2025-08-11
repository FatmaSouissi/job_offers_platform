-- Database Schema for Job Offers and Internships Platform

-- Users table (for both job seekers and employers)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    user_type ENUM('job_seeker', 'employer', 'admin') NOT NULL,
    profile_picture VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    company_size ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
    website VARCHAR(255),
    logo VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    founded_year YEAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job categories table
CREATE TABLE job_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job offers table
CREATE TABLE job_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    job_type ENUM('full_time', 'part_time', 'contract', 'internship') NOT NULL,
    experience_level ENUM('entry', 'junior', 'mid', 'senior', 'lead') NOT NULL,
    salary_min DECIMAL(10, 2),
    salary_max DECIMAL(10, 2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    location VARCHAR(255),
    is_remote BOOLEAN DEFAULT FALSE,
    category_id INT,
    application_deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES job_categories(id) ON DELETE SET NULL
);

-- Job seeker profiles table
CREATE TABLE job_seeker_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resume_url VARCHAR(255),
    bio TEXT,
    skills TEXT, -- JSON format for skills array
    experience_years INT DEFAULT 0,
    education_level ENUM('high_school', 'bachelor', 'master', 'phd', 'other'),
    current_position VARCHAR(255),
    desired_position VARCHAR(255),
    desired_salary DECIMAL(10, 2),
    availability_date DATE,
    linkedin_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Applications table
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_offer_id INT NOT NULL,
    user_id INT NOT NULL,
    cover_letter TEXT,
    resume_url VARCHAR(255),
    status ENUM('pending', 'reviewed', 'interview', 'accepted', 'rejected') DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_offer_id) REFERENCES job_offers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_application (job_offer_id, user_id)
);

-- Job skills table (many-to-many relationship)
CREATE TABLE job_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_offer_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (job_offer_id) REFERENCES job_offers(id) ON DELETE CASCADE
);

-- Saved jobs table (for job seekers to save jobs)
CREATE TABLE saved_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_offer_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_offer_id) REFERENCES job_offers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_saved_job (user_id, job_offer_id)
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('application_status', 'new_job', 'interview', 'general') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert sample job categories
INSERT INTO job_categories (category_name, description) VALUES
('Software Development', 'Programming, web development, mobile development'),
('Data Science', 'Data analysis, machine learning, AI'),
('Design', 'UI/UX design, graphic design, web design'),
('Marketing', 'Digital marketing, content marketing, SEO'),
('Sales', 'Business development, account management'),
('Human Resources', 'Recruiting, HR management, employee relations'),
('Finance', 'Accounting, financial analysis, investment'),
('Operations', 'Project management, business operations'),
('Customer Service', 'Support, customer success, helpdesk'),
('Engineering', 'Mechanical, electrical, civil engineering');