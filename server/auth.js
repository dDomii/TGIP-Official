import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

export async function loginUser(username, password) {
  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND active = TRUE',
      [username]
    );

    if (users.length === 0) {
      return { success: false, message: 'Invalid credentials or account inactive' };
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, message: 'Invalid credentials' };
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department,
        staff_house: user.staff_house
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Server error' };
  }
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function createUser(userData) {
  try {
    // Validate required fields
    if (!userData.gcash_number || userData.gcash_number.trim() === '') {
      return { success: false, message: 'GCash number is required' };
    }
    
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, department, staff_house, gcash_number, required_hours, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userData.username, hashedPassword, userData.role, userData.department, userData.staff_house, userData.gcash_number.trim(), userData.required_hours || 0, userData.active]
    );

    return { success: true, userId: result.insertId };
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: 'Username already exists' };
    }
    return { success: false, message: 'Server error' };
  }
}

export async function updateUser(userId, userData) {
  try {
    // Validate required fields for updates
    if (!userData.gcash_number || userData.gcash_number.trim() === '') {
      return { success: false, message: 'GCash number is required' };
    }
    
    let query = 'UPDATE users SET department = ?, staff_house = ?, gcash_number = ?, required_hours = ?, active = ?';
    let params = [userData.department, userData.staff_house, userData.gcash_number.trim(), userData.required_hours || 0, userData.active];

    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    await pool.execute(query, params);
    return { success: true };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, message: 'Server error' };
  }
}

export async function deleteUser(userId) {
  try {
    // Check if user has any time entries or payslips
    const [timeEntries] = await pool.execute(
      'SELECT COUNT(*) as count FROM time_entries WHERE user_id = ?',
      [userId]
    );

    const [payslips] = await pool.execute(
      'SELECT COUNT(*) as count FROM payslips WHERE user_id = ?',
      [userId]
    );

    if (timeEntries[0].count > 0 || payslips[0].count > 0) {
      // If user has records, just deactivate instead of deleting
      await pool.execute(
        'UPDATE users SET active = FALSE WHERE id = ?',
        [userId]
      );
      return { success: true, message: 'User deactivated (has existing records)' };
    } else {
      // If no records, safe to delete
      await pool.execute(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );
      return { success: true, message: 'User deleted successfully' };
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, message: 'Server error' };
  }
}