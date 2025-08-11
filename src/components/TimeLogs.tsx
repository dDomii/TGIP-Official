import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Calendar, Clock, User, Download, Filter } from 'lucide-react';

interface TimeLog {
  id: number;
  user_id: number;
  username: string;
  department: string;
  clock_in: string;
  clock_out: string | null;
  date: string;
  week_start: string;
  overtime_requested: boolean;
  overtime_approved: boolean | null;
  overtime_note: string | null;
}

const DEPARTMENTS = [
  'Human Resource',
  'Marketing', 
  'Finance',
  'Account Management',
  'System Automation',
  'Sales',
  'Training',
  'IT Department'
];

const DEPARTMENT_COLORS = {
  'Human Resource': 'text-orange-400',
  'Marketing': 'text-gray-400',
  'Finance': 'text-sky-400',
  'Account Management': 'text-yellow-400',
  'System Automation': 'text-green-400',
  'Sales': 'text-pink-400',
  'Training': 'text-cyan-400',
  'IT Department': 'text-purple-400'
};

export function TimeLogs() {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    // Set current week as default
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    setSelectedWeek(currentWeekStart);
    fetchTimeLogs(currentWeekStart);
  }, []);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const getWeekEnd = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  };

  const generateWeekOptions = () => {
    const weeks = [];
    const today = new Date();
    
    // Generate last 12 weeks
    for (let i = 0; i < 12; i++) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      const weekStart = getWeekStart(weekDate);
      const weekEnd = getWeekEnd(weekStart);
      
      weeks.push({
        value: weekStart,
        label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
        isCurrent: i === 0
      });
    }
    
    return weeks;
  };

  const fetchTimeLogs = async (weekStart?: string) => {
    setLoading(true);
    try {
      let url = API_ENDPOINTS.TIME_LOGS;
      if (weekStart) {
        url += `?weekStart=${weekStart}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTimeLogs(data);
    } catch (error) {
      console.error('Error fetching time logs:', error);
    }
    setLoading(false);
  };

  const handleWeekChange = (week: string) => {
    setSelectedWeek(week);
    fetchTimeLogs(week);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateWorkedHours = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return 0;
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const exportToCSV = () => {
    if (timeLogs.length === 0) return;

    const headers = [
      'Date',
      'Employee',
      'Department',
      'Clock In',
      'Clock Out',
      'Hours Worked',
      'Overtime Requested',
      'Overtime Approved',
      'Overtime Note'
    ];

    const rows = timeLogs.map(log => [
      log.date,
      log.username,
      log.department,
      formatTime(log.clock_in),
      formatTime(log.clock_out),
      log.clock_out ? calculateWorkedHours(log.clock_in, log.clock_out).toFixed(2) : '0.00',
      log.overtime_requested ? 'Yes' : 'No',
      log.overtime_approved === null ? 'Pending' : (log.overtime_approved ? 'Approved' : 'Rejected'),
      log.overtime_note || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `time_logs_week_${selectedWeek}.csv`;
    link.click();
  };

  // Filter logs by department if selected
  const filteredLogs = selectedDepartment 
    ? timeLogs.filter(log => log.department === selectedDepartment)
    : timeLogs;

  // Group logs by department and date
  const groupedLogs = DEPARTMENTS.reduce((acc, dept) => {
    acc[dept] = filteredLogs.filter(log => log.department === dept);
    return acc;
  }, {} as Record<string, TimeLog[]>);

  const weekOptions = generateWeekOptions();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Time Logs</h2>
          <p className="text-slate-400">View all employee time entries by week and department</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedWeek}
            onChange={(e) => handleWeekChange(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            {weekOptions.map(week => (
              <option key={week.value} value={week.value}>
                {week.label} {week.isCurrent ? '(Current Week)' : ''}
              </option>
            ))}
          </select>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-slate-700/50 border border-slate-600 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          {filteredLogs.length > 0 && (
            <button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Total Entries</p>
            <p className="text-2xl font-bold text-emerald-400">{filteredLogs.length}</p>
          </div>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Completed Shifts</p>
            <p className="text-2xl font-bold text-blue-400">
              {filteredLogs.filter(log => log.clock_out).length}
            </p>
          </div>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Overtime Requests</p>
            <p className="text-2xl font-bold text-orange-400">
              {filteredLogs.filter(log => log.overtime_requested).length}
            </p>
          </div>
        </div>
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="text-center">
            <p className="text-sm text-slate-400">Total Hours</p>
            <p className="text-2xl font-bold text-purple-400">
              {filteredLogs.reduce((sum, log) => sum + calculateWorkedHours(log.clock_in, log.clock_out), 0).toFixed(1)}h
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading time logs...</p>
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="space-y-6">
          {DEPARTMENTS.map((department) => {
            const deptLogs = groupedLogs[department];
            if (deptLogs.length === 0) return null;

            const deptHours = deptLogs.reduce((sum, log) => sum + calculateWorkedHours(log.clock_in, log.clock_out), 0);
            const colorClass = DEPARTMENT_COLORS[department];

            return (
              <div key={department} className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
                <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
                  <div className="flex justify-between items-center">
                    <h3 className={`text-lg font-semibold ${colorClass}`}>{department}</h3>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">{deptLogs.length} entries</p>
                      <p className="text-lg font-bold text-emerald-400">{deptHours.toFixed(1)}h</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-700/30">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Employee</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Clock In</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Clock Out</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-300">Hours</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-300">Overtime</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-300">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {deptLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-white">{formatDate(log.date)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-white">{log.username}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400">{formatTime(log.clock_in)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {log.clock_out ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-400" />
                                <span className="text-red-400">{formatTime(log.clock_out)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Still active</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-medium text-white">
                              {calculateWorkedHours(log.clock_in, log.clock_out).toFixed(2)}h
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {log.overtime_requested ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.overtime_approved === null
                                  ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/50'
                                  : log.overtime_approved
                                  ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/50'
                                  : 'bg-red-900/20 text-red-400 border border-red-800/50'
                              }`}>
                                {log.overtime_approved === null ? 'Pending' : (log.overtime_approved ? 'Approved' : 'Rejected')}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {log.overtime_note ? (
                              <span className="text-sm text-slate-300 truncate max-w-xs block">
                                {log.overtime_note}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Clock className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Time Logs</h3>
          <p className="text-slate-400">
            No time entries found for the selected week{selectedDepartment && ` in ${selectedDepartment}`}.
          </p>
        </div>
      )}
    </div>
  );
}