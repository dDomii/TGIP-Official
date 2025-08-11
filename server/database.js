import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'ojt') NOT NULL DEFAULT 'ojt',
        department VARCHAR(100),
        staff_house BOOLEAN DEFAULT FALSE,
        gcash_number VARCHAR(20),
        required_hours DECIMAL(5,2) DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Time entries table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        clock_in TIMESTAMP NOT NULL,
        clock_out TIMESTAMP NULL,
        overtime_requested BOOLEAN DEFAULT FALSE,
        overtime_note TEXT,
        overtime_approved BOOLEAN DEFAULT NULL,
        overtime_approved_by INT NULL,
        date DATE NOT NULL,
        week_start DATE NOT NULL,
        overtime_notification_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (overtime_approved_by) REFERENCES users(id)
      )
    `);

    // Payslips table with clock in/out times
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payslips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        total_hours DECIMAL(5,2) NOT NULL,
        overtime_hours DECIMAL(5,2) DEFAULT 0,
        undertime_hours DECIMAL(5,2) DEFAULT 0,
        base_salary DECIMAL(10,2) NOT NULL,
        overtime_pay DECIMAL(10,2) DEFAULT 0,
        undertime_deduction DECIMAL(10,2) DEFAULT 0,
        staff_house_deduction DECIMAL(10,2) DEFAULT 0,
        total_salary DECIMAL(10,2) NOT NULL,
        clock_in_time TIMESTAMP NULL,
        clock_out_time TIMESTAMP NULL,
        status ENUM('pending', 'released') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Payslip logs table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payslip_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action ENUM('generated', 'released') NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        payslip_count INT NOT NULL,
        user_ids TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);

    // Add clock_in_time and clock_out_time columns if they don't exist
    try {
      await pool.execute(`
        ALTER TABLE payslips 
        ADD COLUMN clock_in_time TIMESTAMP NULL,
        ADD COLUMN clock_out_time TIMESTAMP NULL
      `);
    } catch (error) {
      // Columns might already exist, ignore error
    }

    // Add required_hours column if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN required_hours DECIMAL(5,2) DEFAULT 0
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add breaktime_enabled column if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN breaktime_enabled BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add system settings table for global settings
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `);

    // Insert default breaktime setting if not exists
    try {
      await pool.execute(`
        INSERT IGNORE INTO system_settings (setting_key, setting_value) 
        VALUES ('breaktime_enabled', 'false')
      `);
    } catch (error) {
      // Setting might already exist, ignore error
    }

    // Create default admin user if not exists
    const [existingAdmin] = await pool.execute(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );

    if (existingAdmin.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      
      await pool.execute(
        'INSERT INTO users (username, password, role, department, active) VALUES (?, ?, "admin", "IT Department", TRUE)',
        ['admin', hashedPassword]
      );
    }

  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export { pool };
