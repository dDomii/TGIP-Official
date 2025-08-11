import { pool } from './database.js';

export async function clockIn(userId) {
  try {
    const now = new Date();

    // Normalize today's start and tomorrow's start
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const [existing] = await pool.execute(`
      SELECT id FROM time_entries
      WHERE user_id = ?
        AND clock_in >= ?
        AND clock_in < ?
        AND clock_out IS NULL
    `, [userId, todayStart.toISOString(), tomorrowStart.toISOString()]);

    if (existing.length > 0) {
      return { success: false, message: 'Already clocked in today' };
    }

    const [todayEntries] = await pool.execute(`
      SELECT id FROM time_entries
      WHERE user_id = ?
        AND clock_in >= ?
        AND clock_in < ?
    `, [userId, todayStart.toISOString(), tomorrowStart.toISOString()]);

    if (todayEntries.length > 0) {
      return { success: false, message: 'Already clocked in today', hasEntry: true };
    }

    const weekStart = getWeekStart(now); // calculate based on UTC/local etc.
    const [result] = await pool.execute(`
      INSERT INTO time_entries (user_id, clock_in, date, week_start)
      VALUES (?, ?, ?, ?)
    `, [userId, now, tomorrowStart.toISOString().slice(0,10), weekStart]);

    return { success: true, entryId: result.insertId };
  } catch (error) {
    console.error('Clock in error:', error);
    return { success: false, message: 'Server error' };
  }
}


export async function clockOut(userId, overtimeNote = null) {
  try {
    const now = new Date();

    // Define the start of today and tomorrow for index-friendly range checks
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfDay.getDate() + 1);

    // Find active time entry using datetime range
    const [entries] = await pool.execute(
      `SELECT * FROM time_entries
       WHERE user_id = ?
         AND clock_in >= ?
         AND clock_in < ?
         AND clock_out IS NULL
       LIMIT 1`,
      [
        userId,
        startOfDay.toISOString(),
        startOfNextDay.toISOString()
      ]
    );

    if (entries.length === 0) {
      return { success: false, message: 'No active clock-in found' };
    }

    const entry = entries[0];

    // Update the entry with clock out time and optional overtime note
    await pool.execute(
      `UPDATE time_entries
       SET clock_out = ?, overtime_note = ?
       WHERE id = ?`,
      [now, overtimeNote, entry.id]
    );

    return { success: true };
  } catch (error) {
    console.error('Clock out error:', error);
    return { success: false, message: 'Server error' };
  }
}


export async function getTodayEntry(userId) {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfDay.getDate() + 1);

    const [entries] = await pool.execute(
      `SELECT *
       FROM time_entries
       WHERE user_id = ?
         AND clock_in >= ?
         AND clock_in < ?
       ORDER BY clock_in DESC
       LIMIT 1`,
      [
        userId,
        startOfDay.toISOString(),
        startOfNextDay.toISOString()
      ]
    );

    return entries[0] || null;
  } catch (error) {
    console.error('Get today entry error:', error);
    return null;
  }
}


export async function getOvertimeRequests() {
  try {
    const [requests] = await pool.execute(`
      SELECT te.*, u.username, u.department 
      FROM time_entries te 
      JOIN users u ON te.user_id = u.id 
      WHERE te.overtime_requested = TRUE AND te.overtime_approved IS NULL
      ORDER BY te.created_at DESC
    `);

    return requests;
  } catch (error) {
    console.error('Get overtime requests error:', error);
    return [];
  }
}

export async function approveOvertime(entryId, approved, adminId) {
  try {
    await pool.execute(
      'UPDATE time_entries SET overtime_approved = ?, overtime_approved_by = ?, overtime_notification_sent = FALSE WHERE id = ?',
      [approved, adminId, entryId]
    );

    return { success: true };
  } catch (error) {
    console.error('Approve overtime error:', error);
    return { success: false, message: 'Server error' };
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}