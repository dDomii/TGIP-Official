import { pool } from './database.js';
import { startOfWeek, endOfWeek, isBefore, addWeeks, addDays } from 'date-fns';
// Helper function to get breaktime setting
async function getBreaktimeSetting() {
  try {
    const [result] = await pool.execute(
      'SELECT setting_value FROM system_settings WHERE setting_key = "breaktime_enabled"'
    );
    return result.length > 0 ? result[0].setting_value === 'true' : false;
  } catch (error) {
    console.error('Error getting breaktime setting:', error);
    return false;
  }
}

export async function calculateWeeklyPayroll(userId, weekStart) {
  try {
    const breaktimeEnabled = await getBreaktimeSetting();
    const standardHoursPerDay = 8.5; // Always 8.5 hours for ₱200 base pay
    const hourlyRate = 200 / 8.5; // ₱23.53 per hour
    
    const [entries] = await pool.execute(
      'SELECT * FROM time_entries WHERE user_id = ? AND week_start = ? ORDER BY clock_in',
      [userId, weekStart]
    );

    const [user] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) return null;

    const userData = user[0];
    let totalHours = 0;
    let overtimeHours = 0;
    let undertimeHours = 0;

    // Get first and last clock times for the week
    let firstClockIn = null;
    let lastClockOut = null;

    entries.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      let clockOut = entry.clock_out ? new Date(entry.clock_out) : null;

      // Skip entries without clock_out when generating payroll
      if (!clockOut) {
        return; // Skip this entry
      }

      // Define shift start time (7:00 AM)
      const shiftStart = new Date(clockIn);
      shiftStart.setHours(7, 0, 0, 0);
      
      // Define shift end time (3:30 PM)
      const shiftEnd = new Date(clockIn);
      shiftEnd.setHours(15, 30, 0, 0);
      
      // Work hours only count from 7:00 AM onwards
      const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
      
      // Calculate worked hours from 7:00 AM onwards only
      let workedHours = Math.max(0, (clockOut - effectiveClockIn) / (1000 * 60 * 60));
      
      // Only count positive worked hours
      if (workedHours <= 0) {
        return; // Skip if no valid work time
      }
      
      // Track first clock in and last clock out
      if (!firstClockIn || clockIn < firstClockIn) {
        firstClockIn = clockIn;
      }
      if (!lastClockOut || clockOut > lastClockOut) {
        lastClockOut = clockOut;
      }

      // Check for late clock in (after 7:00 AM)
      if (clockIn > shiftStart) {
        const lateHours = (clockIn - shiftStart) / (1000 * 60 * 60);
        undertimeHours += lateHours;
      }

      // Handle overtime calculation
      if (entry.overtime_requested && entry.overtime_approved) {
        if (clockOut > shiftEnd) {
          // Overtime starts immediately at 3:30 PM when approved
          const overtime = Math.max(0, (clockOut - shiftEnd) / (1000 * 60 * 60));
          overtimeHours += overtime;
        }
      }
      
      // Add to total hours - actual worked hours from 7:00 AM
      totalHours += workedHours;
    });
      console.log("Hour Rate:::", hourlyRate);
      console.log("Under Time:::", undertimeDeduction);
    // Base salary is always ₱200
    const baseSalary = 200;
    const overtimePay = overtimeHours * 35;
    const undertimeDeduction = undertimeHours * hourlyRate;
    const staffHouseDeduction = userData.staff_house ? 250 : 0;

    const totalSalary = baseSalary + overtimePay - undertimeDeduction;

    return {
      totalHours,
      overtimeHours,
      undertimeHours,
      baseSalary,
      overtimePay,
      undertimeDeduction,
      staffHouseDeduction,
      totalSalary,
      clockInTime: firstClockIn ? formatDateTimeForMySQL(firstClockIn) : null,
      clockOutTime: lastClockOut ? formatDateTimeForMySQL(lastClockOut) : null
    };

  } catch (error) {
    console.error('Calculate payroll error:', error);

    return null;
  }
}

// Helper function to format datetime for MySQL
function formatDateTimeForMySQL(date) {
  if (!date) return null;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


export async function generatePayslipsForDateRange(startDate, endDate) {
  try {
    const payslips = [];

    // Step 1: Get all active users with time entries in the range
    const [users] = await pool.execute(`
      SELECT DISTINCT u.id, u.username, u.department 
      FROM users u
      JOIN time_entries te ON u.id = te.user_id
      WHERE u.active = TRUE AND DATE(te.clock_in) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Step 2: Loop over each week in the range
    let current = startOfWeek(new Date(startDate), { weekStartsOn: 1 }); // Monday
    const end = new Date(endDate);

    while (isBefore(current, end) || current.getTime() === end.getTime()) {
      const weekStart = current.toISOString().split('T')[0];
      const weekEnd = endOfWeek(current, { weekStartsOn: 1 }).toISOString().split('T')[0];

      for (const user of users) {
        // Calculate payroll for this user and week
        const payroll = await calculatePayrollForDateRange(user.id, weekStart, weekEnd);
        if (payroll && payroll.totalHours > 0) {
          const [existing] = await pool.execute(
            'SELECT id FROM payslips WHERE user_id = ? AND week_start = ? AND week_end = ?',
            [user.id, weekStart, weekEnd]
          );

          if (existing.length === 0) {
            const [result] = await pool.execute(
              `INSERT INTO payslips (user_id, week_start, week_end, total_hours, overtime_hours, 
               undertime_hours, base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
               total_salary, clock_in_time, clock_out_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                user.id, weekStart, weekEnd,
                payroll.totalHours, payroll.overtimeHours, payroll.undertimeHours,
                payroll.baseSalary, payroll.overtimePay, payroll.undertimeDeduction,
                payroll.staffHouseDeduction, payroll.totalSalary,
                payroll.clockInTime, payroll.clockOutTime
              ]
            );

            payslips.push({
              id: result.insertId,
              user: user.username,
              department: user.department,
              ...payroll,
              weekStart,
              weekEnd,
            });
          }
        }
      }

      // Move to next week
      current = addWeeks(current, 1);
    }

    return payslips;
  } catch (error) {
    console.error('Generate payslips error:', error);
    return [];
  }
}


export async function generatePayslipsForSpecificDays(selectedDates, userIds = null) {
  try {
    const payslips = [];

    for (const date of selectedDates) {
      let userCondition = '';
      const queryParams = [date];

      if (userIds && userIds.length > 0) {
        userCondition = ` AND u.id IN (${userIds.map(() => '?').join(',')})`;
        queryParams.push(...userIds);
      }

      // Fetch users who have clock-ins on this specific date
      const [users] = await pool.execute(`
        SELECT DISTINCT u.* FROM users u 
        JOIN time_entries te ON u.id = te.user_id
        WHERE u.active = TRUE AND DATE(te.clock_in) = ?${userCondition}
      `, queryParams);

      for (const user of users) {
        // Calculate payroll for just this single date
        const payroll = await calculatePayrollForSpecificDays(user.id, [date]);

        if (payroll && payroll.totalHours > 0) {
          // Check if a payslip for this user and date already exists
          const [existing] = await pool.execute(
            'SELECT id FROM payslips WHERE user_id = ? AND week_start = ? AND week_end = ?',
            [user.id, date, date]
          );

          if (existing.length === 0) {
            const [result] = await pool.execute(
              `INSERT INTO payslips (user_id, week_start, week_end, total_hours, overtime_hours, 
               undertime_hours, base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
               total_salary, clock_in_time, clock_out_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                user.id, date, date,
                payroll.totalHours, payroll.overtimeHours, payroll.undertimeHours,
                payroll.baseSalary, payroll.overtimePay, payroll.undertimeDeduction,
                payroll.staffHouseDeduction, payroll.totalSalary,
                payroll.clockInTime, payroll.clockOutTime
              ]
            );

            payslips.push({
              id: result.insertId,
              user: user.username,
              department: user.department,
              date,
              ...payroll
            });
          }
        }
      }
    }

    return payslips;
  } catch (error) {
    console.error('Generate payslips for specific days error:', error);
    return [];
  }
}


export async function calculatePayrollForSpecificDays(userId, selectedDates) {
  try {
    const standardHoursPerDay = 8.5; // Always 8.5 hours for ₱200 base pay
    const hourlyRate = 200 / 8.5; // ₱23.53 per hour
    
    // Build date conditions for specific days
    const dateConditions = selectedDates.map(() => 'DATE(clock_in) = ?').join(' OR ');
    
    const [entries] = await pool.execute(
      `SELECT * FROM time_entries WHERE user_id = ? AND (${dateConditions}) ORDER BY clock_in`,
      [userId, ...selectedDates]
    );

    const [user] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) return null;

    const userData = user[0];
    let totalHours = 0;
    let overtimeHours = 0;
    let undertimeHours = 0;

    // Get first and last clock times for the selected days
    let firstClockIn = null;
    let lastClockOut = null;

    entries.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      let clockOut = entry.clock_out ? new Date(entry.clock_out) : null;

      // Skip entries without clock_out when generating payroll
      if (!clockOut) {
        return; // Skip this entry
      }

      // Define shift start time (7:00 AM)
      const shiftStart = new Date(clockIn);
      shiftStart.setHours(7, 0, 0, 0);
      
      // Define shift end time (3:30 PM)
      const shiftEnd = new Date(clockIn);
      shiftEnd.setHours(15, 30, 0, 0);
      
      // Work hours only count from 7:00 AM onwards
      const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
      
      // Calculate worked hours from 7:00 AM onwards only
      let workedHours = Math.max(0, (clockOut - effectiveClockIn) / (1000 * 60 * 60));
      
      // Only count positive worked hours
      if (workedHours <= 0) {
        return; // Skip if no valid work time
      }
      
      // Track first clock in and last clock out
      if (!firstClockIn || clockIn < firstClockIn) {
        firstClockIn = clockIn;
      }
      if (!lastClockOut || clockOut > lastClockOut) {
        lastClockOut = clockOut;
      }

      // Check for late clock in (after 7:00 AM)
      if (clockIn > shiftStart) {
        const lateHours = (clockIn - shiftStart) / (1000 * 60 * 60);
        undertimeHours += lateHours;
      }

      // Check for undertime (Before 3:30 PM)
      if (clockOut < shiftEnd) {
        const earlyOut = (shiftEnd - clockOut) / (1000 * 60 * 60);
        undertimeHours += earlyOut;
      }

      // Handle overtime calculation
      if (entry.overtime_requested && entry.overtime_approved) {
        if (clockOut > shiftEnd) {
          // Overtime starts immediately at 3:30 PM when approved
          const overtime = Math.max(0, (clockOut - shiftEnd) / (1000 * 60 * 60));
          overtimeHours += overtime;
        }
      }
      
      // Add to total hours - actual worked hours from 7:00 AM
      totalHours += workedHours;
    });

    // Base salary is always ₱200
    const baseSalary = 200;
    const overtimePay = overtimeHours * 35;
    const undertimeDeduction = undertimeHours * hourlyRate;
    
    // Count actual working days from selected dates
    const workingDays = entries.filter(entry => entry.clock_out).length;
    const staffHouseDeduction = userData.staff_house ? (250 * workingDays / 5) : 0; // Prorated based on actual working days
    
    const totalSalary = baseSalary + overtimePay - undertimeDeduction;

    return {
      totalHours,
      overtimeHours,
      undertimeHours,
      baseSalary,
      overtimePay,
      undertimeDeduction,
      staffHouseDeduction,
      totalSalary,
      clockInTime: firstClockIn ? formatDateTimeForMySQL(firstClockIn) : null,
      clockOutTime: lastClockOut ? formatDateTimeForMySQL(lastClockOut) : null
    };
  } catch (error) {
    console.error('Calculate payroll for specific days error:', error);
    return null;
  }
}

export async function calculatePayrollForDateRange(userId, startDate, endDate) {
  try {
    const standardHoursPerDay = 8.5; // Always 8.5 hours for ₱200 base pay
    const hourlyRate = 200 / 8.5; // ₱23.53 per hour
    
    const [entries] = await pool.execute(
      'SELECT * FROM time_entries WHERE user_id = ? AND DATE(clock_in) BETWEEN ? AND ? ORDER BY clock_in',
      [userId, startDate, endDate]
    );

    const [user] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) return null;

    const userData = user[0];
    let totalHours = 0;
    let overtimeHours = 0;
    let undertimeHours = 0;

    // Get first and last clock times for the date range
    let firstClockIn = null;
    let lastClockOut = null;

    entries.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      let clockOut = entry.clock_out ? new Date(entry.clock_out) : null;

      // Skip entries without clock_out when generating payroll
      if (!clockOut) {
        return; // Skip this entry
      }

      // Define shift start time (7:00 AM)
      const shiftStart = new Date(clockIn);
      shiftStart.setHours(7, 0, 0, 0);
      
      // Define shift end time (3:30 PM)
      const shiftEnd = new Date(clockIn);
      shiftEnd.setHours(15, 30, 0, 0);
      
      // Work hours only count from 7:00 AM onwards
      const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
      
      // Calculate worked hours from 7:00 AM onwards only
      let workedHours = Math.max(0, (clockOut - effectiveClockIn) / (1000 * 60 * 60));
      
      // Only count positive worked hours
      if (workedHours <= 0) {
        return; // Skip if no valid work time
      }
      
      // Track first clock in and last clock out
      if (!firstClockIn || clockIn < firstClockIn) {
        firstClockIn = clockIn;
      }
      if (!lastClockOut || clockOut > lastClockOut) {
        lastClockOut = clockOut;
      }

      // Check for late clock in (after 7:00 AM)
      if (clockIn > shiftStart) {
        const lateHours = (clockIn - shiftStart) / (1000 * 60 * 60);
        undertimeHours += lateHours;
      }


      // Handle overtime calculation
      if (entry.overtime_requested && entry.overtime_approved) {
        if (clockOut > shiftEnd) {
          // Overtime starts immediately at 3:30 PM when approved
          const overtime = Math.max(0, (clockOut - shiftEnd) / (1000 * 60 * 60));
          overtimeHours += overtime;
        }
      }
      
      // Add to total hours - actual worked hours from 7:00 AM
      totalHours += workedHours;
    });

    // Base salary is always ₱200
    const baseSalary = 200;
    const overtimePay = overtimeHours * 35;
    const undertimeDeduction = undertimeHours * hourlyRate;
    
    // Calculate number of working days for staff house deduction
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const staffHouseDeduction = userData.staff_house ? (250 * daysDiff / 5) : 0; // Prorated
    
    const totalSalary = baseSalary + overtimePay - undertimeDeduction;

    return {
      totalHours,
      overtimeHours,
      undertimeHours,
      baseSalary,
      overtimePay,
      undertimeDeduction,
      staffHouseDeduction,
      totalSalary,
      clockInTime: firstClockIn ? formatDateTimeForMySQL(firstClockIn) : null,
      clockOutTime: lastClockOut ? formatDateTimeForMySQL(lastClockOut) : null
    };
  } catch (error) {
    console.error('Calculate payroll for date range error:', error);
    return null;
  }
}

// Keep the original function for backward compatibility
export async function generateWeeklyPayslips(weekStart) {
  try {
    const payslips = [];
    const start = new Date(weekStart);

    // Get all active users who have entries in the week
    const [users] = await pool.execute(`
      SELECT DISTINCT u.* FROM users u 
      JOIN time_entries te ON u.id = te.user_id
      WHERE u.active = TRUE AND DATE(te.clock_in) BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
    `, [weekStart, weekStart]);

    for (const user of users) {
      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(start, i);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Calculate payroll for the specific day
        const payroll = await calculatePayrollForSpecificDays(user.id, [dateStr]);

        if (payroll && payroll.totalHours > 0) {
          const [existing] = await pool.execute(
            'SELECT id FROM payslips WHERE user_id = ? AND week_start = ? AND week_end = ?',
            [user.id, dateStr, dateStr]
          );

          if (existing.length === 0) {
            const [result] = await pool.execute(
              `INSERT INTO payslips (user_id, week_start, week_end, total_hours, overtime_hours, 
               undertime_hours, base_salary, overtime_pay, undertime_deduction, staff_house_deduction, 
               total_salary, clock_in_time, clock_out_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                user.id, dateStr, dateStr,
                payroll.totalHours, payroll.overtimeHours, payroll.undertimeHours,
                payroll.baseSalary, payroll.overtimePay, payroll.undertimeDeduction,
                payroll.staffHouseDeduction, payroll.totalSalary,
                payroll.clockInTime, payroll.clockOutTime
              ]
            );

            payslips.push({
              id: result.insertId,
              user: user.username,
              department: user.department,
              date: dateStr,
              ...payroll
            });
          }
        }
      }
    }

    return payslips;
  } catch (error) {
    console.error('Generate weekly payslips error:', error);
    return [];
  }
}

export async function getPayrollReport(startDate, endDate, selectedDates = []) {
  try {
    let query, params;

    if (selectedDates.length > 0) {
      const placeholders = selectedDates.map(() => '?').join(',');
      query = `
        SELECT p.*, u.username, u.department
        FROM payslips p
        JOIN users u ON p.user_id = u.id
        WHERE p.week_start IN (${placeholders})
        ORDER BY u.department, u.username, p.week_start
      `;
      params = selectedDates;

    } else if (startDate && endDate) {
      query = `
        SELECT p.*, u.username, u.department
        FROM payslips p
        JOIN users u ON p.user_id = u.id
        WHERE p.week_start BETWEEN ? AND ?
        ORDER BY u.department, u.username, p.week_start
      `;
      params = [startDate, endDate];

    } else if (startDate) {
      query = `
        SELECT p.*, u.username, u.department
        FROM payslips p
        JOIN users u ON p.user_id = u.id
        WHERE p.week_start = ?
        ORDER BY u.department, u.username, p.week_start
      `;
      params = [startDate];

    } else {
      return []; // No valid filters
    }

    const [payslips] = await pool.execute(query, params);
    console.log(payslips);
    return payslips;
  } catch (error) {
    console.error('Get payroll report error:', error);
    return [];
  }
}

export async function updatePayrollEntry(payslipId, updateData) {
  try {
    const { clockIn, clockOut, totalHours, overtimeHours, undertimeHours, baseSalary, overtimePay, undertimeDeduction, staffHouseDeduction } = updateData;
    
    const totalSalary = baseSalary + overtimePay - undertimeDeduction;

    // Format datetime values for MySQL
    const formattedClockIn = clockIn ? formatDateTimeForMySQL(new Date(clockIn)) : null;
    const formattedClockOut = clockOut ? formatDateTimeForMySQL(new Date(clockOut)) : null;

    // Get the payslip to find the user_id and update their worked hours
    const [payslipResult] = await pool.execute(
      'SELECT user_id, total_hours as old_total_hours FROM payslips WHERE id = ?',
      [payslipId]
    );
    
    if (payslipResult.length === 0) {
      return { success: false, message: 'Payslip not found' };
    }
    
    const userId = payslipResult[0].user_id;
    const oldTotalHours = parseFloat(payslipResult[0].old_total_hours) || 0;
    const newTotalHours = parseFloat(totalHours) || 0;
    const hoursDifference = newTotalHours - oldTotalHours;
    await pool.execute(
      `UPDATE payslips SET 
       clock_in_time = ?, clock_out_time = ?, total_hours = ?, overtime_hours = ?, 
       undertime_hours = ?, base_salary = ?, overtime_pay = ?, undertime_deduction = ?, 
       staff_house_deduction = ?, total_salary = ?
       WHERE id = ?`,
      [formattedClockIn, formattedClockOut, totalHours, overtimeHours, undertimeHours, baseSalary, overtimePay, undertimeDeduction, staffHouseDeduction, totalSalary, payslipId]
    );

    // Update the user's worked hours in time_entries if there's a significant change
    if (Math.abs(hoursDifference) > 0.01) { // Only update if difference is more than 0.01 hours
      // Create an adjustment entry to reflect the change in progress tracker
      const adjustmentDate = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart(new Date());
      
      // Insert an adjustment entry
      await pool.execute(
        `INSERT INTO time_entries (user_id, clock_in, clock_out, date, week_start, overtime_requested, overtime_approved) 
         VALUES (?, ?, ?, ?, ?, FALSE, NULL)`,
        [
          userId,
          formattedClockIn || new Date().toISOString(),
          formattedClockOut || new Date().toISOString(),
          adjustmentDate,
          weekStart
        ]
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Update payroll entry error:', error);
    return { success: false, message: 'Server error' };
  }
}
// Helper function to get week start
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}
