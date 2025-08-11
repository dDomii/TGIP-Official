import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { Calendar, Download, FileText, Users, PhilippinePeso, Clock, Edit3, Save, X, AlertTriangle, CheckCircle, Filter, Search, Eye, Trash2, Play } from 'lucide-react';
import { Calculator } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { startOfWeek, endOfWeek } from 'date-fns';

interface PayrollEntry {
  id: number;
  user_id: number;
  username: string;
  department: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  overtime_hours: number;
  undertime_hours: number;
  base_salary: number;
  overtime_pay: number;
  undertime_deduction: number;
  staff_house_deduction: number;
  total_salary: number;
  date: string; // Added date field for individual entries
  clock_in_time: number | string; // Changed to allow both number and string for flexibility
  clock_out_time: string;
  status: string;
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

export function PayrollReports() {
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedEndWeek, setSelectedEndWeek] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generationMode, setGenerationMode] = useState<'week' | 'dates'>('week');
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null);
  const [editForm, setEditForm] = useState({
    clockIn: '',
    clockOut: '',
    totalHours: 0,
    overtimeHours: 0,
    undertimeHours: 0,
    baseSalary: 0,
    overtimePay: 0,
    undertimeDeduction: 0,
    staffHouseDeduction: 0
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<PayrollEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showBulkTotalModal, setShowBulkTotalModal] = useState(false);
  const [bulkTotalAmount, setBulkTotalAmount] = useState('');
  const [bulkTotalType, setBulkTotalType] = useState<'fixed' | 'percentage'>('fixed');
  const [bulkTotalPercentage, setBulkTotalPercentage] = useState('');
  const [groupByUser, setGroupByUser] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchUsers();
    // Get start of week (Sunday)
    const today = new Date();
    const currentWeekStart = getWeekStart(today);

    // Get end of week (Saturday) = Sunday + 6 days
    const currentWeekEnd = getWeekEnd(currentWeekStart);

    setSelectedWeek(currentWeekStart);
    setSelectedEndWeek(currentWeekEnd);

  }, []);

  const getWeekStart = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return start.toISOString().split('T')[0];
  };

  const getWeekEnd = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = endOfWeek(start, { weekStartsOn: 1 });
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

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    // Generate last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUsers(data.filter((user: any) => user.active));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const generatePayslips = async () => {
    if (generationMode === 'week' && !selectedWeek) {
      alert('Please select a week');
      return;
    }
    
    if (generationMode === 'dates' && selectedDates.length === 0) {
      alert('Please select at least one date');
      return;
    }

    setLoading(true);
    try {
      let requestBody: any = {};
      
      if (generationMode === 'week') {
        requestBody.weekStart = selectedWeek;
        requestBody.startDate = selectedWeek;
        requestBody.endDate = selectedEndWeek;
      } else {
        requestBody.selectedDates = selectedDates;
      }
      
      if (selectedUsers.length > 0) {
        requestBody.userIds = selectedUsers;
      }

      const response = await fetch(API_ENDPOINTS.PAYSLIPS_GENERATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.length > 0) {
       alert(`Generated ${data.length} payslips successfully!`);
        fetchPayrollReport();
         const audio = new Audio('https://www.myinstants.com/media/sounds/kaching-sound-fx.mp3');
         audio.currentTime = 0;
         audio.play();
      } else {
        alert('No payslips were generated. Check if users have time entries for the selected period.');
      }
    } catch (error) {
      console.error('Error generating payslips:', error);
      alert('Failed to generate payslips');
    }
    setLoading(false);
  };

  const fetchPayrollReport = async () => {
    if (generationMode === 'week' && !selectedWeek) return;
    if (generationMode === 'dates' && selectedDates.length === 0) return;

    setLoading(true);
    try {
      let url = API_ENDPOINTS.PAYROLL_REPORT;
      
      if (generationMode === 'week') {
        url = buildApiUrl('/api/payroll-report', { weekStart: selectedWeek, startDate: selectedWeek, endDate: selectedEndWeek });
      } else {
        const datesParam = selectedDates.join(',');
        url = buildApiUrl('/api/payroll-report', { selectedDates: datesParam });
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPayrollData(data);
    } catch (error) {
      console.error('Error fetching payroll report:', error);
    }
    setLoading(false);
  };

  const releasePayslips = async () => {
    if (generationMode === 'week' && !selectedWeek) {
      alert('Please select a week first');
      return;
    }
    
    if (generationMode === 'dates' && selectedDates.length === 0) {
      alert('Please select dates first');
      return;
    }

    // Check if all days of current week are selected
    const isAllCurrentWeekSelected = isAllDaysOfCurrentWeekSelected();
    
    let confirmMessage = `Are you sure you want to release payslips for the selected ${generationMode === 'week' ? 'week' : 'dates'}? This will make them visible to employees.`;
    
    if (isAllCurrentWeekSelected) {
      confirmMessage = `All days of the current week are selected. This will compile individual day payslips into weekly payslips. Are you sure you want to proceed?`;
    }

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) return;

    setLoading(true);
    try {
      let requestBody: any = {};
      
      if (generationMode === 'week') {
        requestBody.selectedDates = [selectedWeek, selectedEndWeek];
      } else {
        // If all days of current week are selected, compile them into weekly payslips
        if (isAllCurrentWeekSelected) {
          const currentWeekStart = getWeekStart(new Date());
          const currentWeekEnd = getWeekEnd(currentWeekStart);
          requestBody.selectedDates = [currentWeekStart, currentWeekEnd];
          requestBody.compileWeekly = true; // Flag to indicate this is a compile operation
        } else {
          requestBody.selectedDates = selectedDates;
        }
      }
      
      if (selectedUsers.length > 0) {
        requestBody.userIds = selectedUsers;
      }

      const response = await fetch(API_ENDPOINTS.PAYSLIPS_RELEASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchPayrollReport();
      } else {
        alert('Failed to release payslips');
      }
    } catch (error) {
      console.error('Error releasing payslips:', error);
      alert('Failed to release payslips');
    }
    setLoading(false);
  };

  const handleEditEntry = (entry: PayrollEntry) => {
    setEditingEntry(entry);
    setEditForm({
      clockIn: entry.clock_in_time ? new Date(entry.clock_in_time).toISOString().slice(0, 16) : '',
      clockOut: entry.clock_out_time ? new Date(entry.clock_out_time).toISOString().slice(0, 16) : '',
      totalHours: entry.total_hours,
      overtimeHours: entry.overtime_hours,
      undertimeHours: entry.undertime_hours,
      baseSalary: entry.base_salary,
      overtimePay: entry.overtime_pay,
      undertimeDeduction: entry.undertime_deduction,
      staffHouseDeduction: entry.staff_house_deduction
    });
    setShowEditModal(true);
  };

  const calculateFromTimes = () => {
    if (!editForm.clockIn || !editForm.clockOut) return;

    const clockIn = new Date(editForm.clockIn);
    const clockOut = new Date(editForm.clockOut);
    
    // Define shift start time (7:00 AM)
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0);
    
    // Define shift end time (3:30 PM)
    const shiftEnd = new Date(clockIn);
    shiftEnd.setHours(15, 30, 0, 0);
    
    // Work hours only count from 7:00 AM onwards
    const effectiveClockIn = clockIn < shiftStart ? shiftStart : clockIn;
    
    // Calculate worked hours from 7:00 AM onwards only
    const workedHours = Math.max(0, (clockOut.getTime() - effectiveClockIn.getTime()) / (1000 * 60 * 60));
    
    // Check for late clock in (after 7:00 AM)
    let undertimeHours = 0;
    if (clockIn > shiftStart) {
      undertimeHours = (clockIn.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
    }
    
    // Calculate overtime (after 3:30 PM)
    let overtimeHours = 0;
    if (clockOut > shiftEnd) {
      overtimeHours = Math.max(0, (clockOut.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60));
    }
    
    // Calculate base salary (capped at ₱200 for 8.5 hours)
    const standardHoursPerDay = 8.5;
    const hourlyRate = 200 / 8.5; // ₱23.53 per hour
    
    // Base salary is always ₱200
    const baseSalary = 200;
    
    // Don't automatically calculate overtime pay - it should be manually set based on approved requests
    const overtimePay = 0; // Admin needs to manually set this based on approved overtime requests
    const undertimeDeduction = undertimeHours * hourlyRate;
    
    setEditForm(prev => ({
      ...prev,
      totalHours: parseFloat(workedHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      undertimeHours: parseFloat(undertimeHours.toFixed(2)),
      baseSalary: parseFloat(baseSalary.toFixed(2)),
      overtimePay: parseFloat(overtimePay.toFixed(2)),
      undertimeDeduction: parseFloat(undertimeDeduction.toFixed(2))
    }));
  };

  const saveEditedEntry = async () => {
    if (!editingEntry) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.PAYROLL}/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingEntry(null);
        fetchPayrollReport();
        alert('Payroll entry updated successfully!');
      } else {
        alert(data.message || 'Failed to update payroll entry');
      }
    } catch (error) {
      console.error('Error updating payroll entry:', error);
      alert('Failed to update payroll entry');
    }
  };

  const handleDeleteEntry = async () => {
    if (!deletingEntry) return;

    try {
      const response = await fetch(`http://192.168.100.60:3001/api/payroll/${deletingEntry.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setShowDeleteModal(false);
        setDeletingEntry(null);
        fetchPayrollReport();
        alert('Payroll entry deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete payroll entry');
      }
    } catch (error) {
      console.error('Error deleting payroll entry:', error);
      alert('Failed to delete payroll entry');
    }
  };

  const exportToPDF = () => {
    if (payrollData.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(16);
    doc.text('Allowance Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    let dateRange = '';
    if (generationMode === 'week') {
      dateRange = `Week: ${formatDate(selectedWeek)} - ${formatDate(getWeekEnd(selectedWeek))}`;
    } else {
      dateRange = selectedDates.length > 1 
        ? `${selectedDates[0]} to ${selectedDates[selectedDates.length - 1]}`
        : selectedDates[0];
    }
    doc.text(`Period: ${dateRange}`, pageWidth / 2, 30, { align: 'center' });
    
    // Table data
    const tableData = userGroups.map(entry => [
      entry.username,
      entry.department,
      Number(entry.totalHours).toFixed(2),
      Number(entry.totalBaseSalary).toFixed(2),
      Number(entry.totalOvertimePay).toFixed(2),
      Number(entry.totalDeductions).toFixed(2),
      Number(entry.totalSalary).toFixed(2),
    ]);

    autoTable(doc, {
      head: [['Employee', 'Department', 'Hours', 'Base Pay', 'OT Pay', 'Deductions', 'Total']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    doc.save(`payroll_report_${dateRange.replace(/\s+/g, '_')}.pdf`);
  };

  const exportToCSV = () => {
    if (payrollData.length === 0) return;

    const headers = [
      'Employee',
      'Department',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Overtime Hours',
      'Undertime Hours',
      'Base Salary (₱)',
      'Overtime Pay (₱)',
      'Undertime Deduction (₱)',
      'Staff House Deduction (₱)',
      'Total Salary (₱)',
      'Status'
    ];

    const rows = payrollData.map(entry => [
      entry.username,
      entry.department,
      entry.clock_in_time ? new Date(entry.clock_in_time).toLocaleString() : 'N/A',
      entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleString() : 'N/A',
      entry.total_hours.toFixed(2),
      entry.overtime_hours.toFixed(2),
      entry.undertime_hours.toFixed(2),
      entry.base_salary.toFixed(2),
      entry.overtime_pay.toFixed(2),
      entry.undertime_deduction.toFixed(2),
      entry.staff_house_deduction.toFixed(2),
      entry.total_salary.toFixed(2),
      entry.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    let filename = 'payroll_report_';
    if (generationMode === 'week') {
      filename += `week_${selectedWeek}`;
    } else {
      const dateRange = selectedDates.length > 1 
        ? `${selectedDates[0]}_to_${selectedDates[selectedDates.length - 1]}`
        : selectedDates[0];
      filename += dateRange;
    }
    filename += '.csv';
    
    link.download = filename;
    link.click();
  };

  const handleDateToggle = (date: string) => {
    setSelectedDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date);
      } else {
        return [...prev, date].sort();
      }
    });
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Helper function to get all dates in a week
  const getAllDatesInWeek = (weekStart: string) => {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Helper function to check if all days of current week are selected
  const isAllDaysOfCurrentWeekSelected = () => {
    if (generationMode !== 'dates') return false;
    
    const currentWeekStart = getWeekStart(new Date());
    const currentWeekEnd = getWeekEnd(currentWeekStart);
    const allCurrentWeekDates = getAllDatesInWeek(currentWeekStart);
    
    // Check if all dates of current week are selected
    return allCurrentWeekDates.every(date => selectedDates.includes(date));
  };

  const filteredPayrollData = payrollData.filter(entry => {
    const matchesSearch = entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === '' || entry.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const totalSalary = filteredPayrollData.reduce((sum, entry) => sum + +entry.total_salary, 0);
  const uniqueUserCount = new Set(
    filteredPayrollData.map(entry => entry.user_id)
  ).size;
  const totalHours = filteredPayrollData.reduce((sum, entry) => sum + +entry.total_hours, 0);
  const totalOvertimeHours = filteredPayrollData.reduce((sum, entry) => sum + +entry.overtime_hours, 0);

  // Group payroll data by user
  const groupedPayrollData = filteredPayrollData.reduce((acc, entry) => {
    const key = `${entry.user_id}-${entry.username}`;
    if (!acc[key]) {
      acc[key] = { user_id: entry.user_id, username: entry.username,
                  department: entry.department, entries: [],
                  totalSalary: 0, totalHours: 0,
                  totalOvertimeHours: 0, totalOvertimePay: 0,
                  totalDeductions: 0, totalBaseSalary: 0, staffHouse: 0, entryCount: 0 };
    }

    const group = acc[key];
    group.entries.push(entry);

    // ⬇ Convert each string field to a number:
    group.totalSalary         += +entry.base_salary + +entry.overtime_pay;
    group.totalHours          += +entry.total_hours;
    group.totalOvertimeHours  += +entry.overtime_hours;
    group.totalOvertimePay    += +entry.overtime_pay;
    group.totalDeductions     += +entry.undertime_deduction;
    group.totalBaseSalary     += +entry.base_salary;
    group.staffHouse          += +entry.staff_house_deduction;
    group.entryCount++;

    return acc;
  }, {} as Record<string, any>);
  
  const userGroups = Object.values(groupedPayrollData);

  // userGroups[1].totalDeductions = 550;
  console.log("USER 2: ", userGroups[1]);
  console.log(userGroups);
  for (const userGroup of userGroups){
    if (userGroup.staffHouse){
      if (userGroup.entryCount >= 1){
        userGroup.totalDeductions += 250;
        console.log("called");
      }
      if (userGroup.entryCount >= 8 ){
        userGroup.totalDeductions += 500;
      }
      if (userGroup.entryCount >= 15 ){
        userGroup.totalDeductions += 750;
      }
      if (userGroup.entryCount >= 22 ){
        userGroup.totalDeductions += 1000;
      }
    }
    userGroup.totalSalary -= userGroup.totalDeductions;
    console.log(userGroup.totalDeductions);
  }
  const groupedTotalSalary = userGroups.reduce((sum, entry) => sum + entry.totalSalary, 0);
  console.log(groupedTotalSalary);

  const weekOptions = generateWeekOptions();
  const dateOptions = generateDateOptions();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Payroll Management</h2>
          <p className="text-slate-400">Generate and manage employee payslips</p>
        </div>
      </div>

      {/* Generation Mode Selection */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Payroll Generation Mode</h3>
        
        <div className="flex gap-4 mb-6">
          <label className="flex items-center space-x-3 cursor-pointer hidden">
            <input
              type="radio"
              value="week"
              checked={generationMode === 'week'}
              onChange={(e) => setGenerationMode(e.target.value as 'week' | 'dates')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-slate-300 font-medium">Weekly Payroll</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              value="dates"
              checked={generationMode === 'dates'}
              onChange={(e) => setGenerationMode(e.target.value as 'week' | 'dates')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-slate-300 font-medium">Specific Dates</span>
          </label>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Week/Date Selection */}
          <div>
            {generationMode === 'week' ? (
              <div className='hidden'>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Select Week
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => {
                    setSelectedWeek(e.target.value);
                    setSelectedEndWeek(getWeekEnd(e.target.value));
                  }}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                >
                  {weekOptions.map(week => (
                    <option key={week.value} value={week.value}>
                      {week.label} {week.isCurrent ? '(Current Week)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                {isAllDaysOfCurrentWeekSelected() && (
                  <div className="mb-3 p-3 bg-purple-500/20 border border-purple-400/30 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-300">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">All days of current week selected - Will compile into weekly payslips</span>
                    </div>
                  </div>
                )}
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Select Dates ({selectedDates.length} selected)
                </label>
                <div className="bg-slate-700/30 rounded-lg p-4 max-h-60 overflow-y-auto border border-slate-600/50">
                  <div className="grid grid-cols-2 gap-2">
                    {dateOptions.map(date => (
                      <label key={date} className="flex items-center space-x-2 p-2 hover:bg-slate-600/30 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDates.includes(date)}
                          onChange={() => handleDateToggle(date)}
                          className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                        />
                        <span className="text-sm text-slate-300">
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Select Users ({selectedUsers.length > 0 ? selectedUsers.length : 'All'} selected)
            </label>
            <div className="bg-slate-700/30 rounded-lg p-4 max-h-60 overflow-y-auto border border-slate-600/50">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 p-2 hover:bg-slate-600/30 rounded cursor-pointer border-b border-slate-600/30">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === 0}
                    onChange={() => setSelectedUsers([])}
                    className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                  />
                  <span className="text-sm font-medium text-emerald-400">All Users</span>
                </label>
                {users.map(user => (
                  <label key={user.id} className="flex items-center space-x-2 p-2 hover:bg-slate-600/30 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                      className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-700/50"
                    />
                    <span className="text-sm text-slate-300">{user.username}</span>
                    <span className="text-xs text-slate-400">({user.department})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={generatePayslips}
            disabled={loading || (generationMode === 'week' && !selectedWeek) || (generationMode === 'dates' && selectedDates.length === 0)}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <FileText className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate Payslips'}
          </button>
          
          <button
            onClick={fetchPayrollReport}
            disabled={loading || (generationMode === 'week' && !selectedWeek) || (generationMode === 'dates' && selectedDates.length === 0)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <Eye className="w-4 h-4" />
            {loading ? 'Loading...' : 'View Report'}
          </button>
          
          <button
            onClick={releasePayslips}
            disabled={loading || (generationMode === 'week' && !selectedWeek) || (generationMode === 'dates' && selectedDates.length === 0)}
            className={`${
              isAllDaysOfCurrentWeekSelected() 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' 
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
            } text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg`}
          >
            <CheckCircle className="w-4 h-4" />
            {isAllDaysOfCurrentWeekSelected() ? 'Compile to Weekly Payslips' : 'Release Payslips'}
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      {payrollData.length > 0 && (
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-slate-700/50">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Search Employees
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-400"
                  placeholder="Search by name or department..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Filter by Department
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end mt-4">
            <label htmlFor="group-by-user" className="flex items-center cursor-pointer">
              <span className="mr-3 text-sm font-medium text-slate-300">Compile all details per user</span>
              <div className="relative">
                <input
                  type="checkbox"
                  id="group-by-user"
                  className="sr-only"
                  checked={groupByUser}
                  onChange={() => setGroupByUser(!groupByUser)}
                />
                <div className="w-10 h-4 bg-slate-600 rounded-full shadow-inner"></div>
                <div className={`dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition-transform ${groupByUser ? 'transform translate-x-full bg-emerald-400' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {filteredPayrollData.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Employees</p>
                <p className="text-2xl font-bold text-white">{uniqueUserCount}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Salary</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ₱{groupByUser
                    ? groupedTotalSalary.toFixed(2)
                    : Number(totalSalary).toFixed(2)}
                </p>

              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
                <PhilippinePeso className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Hours</p>
                <p className="text-2xl font-bold text-blue-400">{Number(totalHours).toFixed(1)}h</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Overtime Hours</p>
                <p className="text-2xl font-bold text-orange-400">{Number(totalOvertimeHours).toFixed(1)}h</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      {filteredPayrollData.length > 0 && (
        <div className="flex gap-4 mb-6">
          <button
            onClick={exportToPDF}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          {/* <button
            onClick={exportToCSV}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button> */}
        </div>
      )}

      {/* Payroll Table */}
      {filteredPayrollData.length > 0 ? (
        groupByUser ? (
          // Grouped View
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
            <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
              <h3 className="text-lg font-semibold text-white">Grouped Payroll Summary</h3>
              <p className="text-sm text-slate-400 mt-1">
                {userGroups.length} employees • Total: ₱{Number(totalSalary).toFixed(2)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Department</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Entries</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Total Hours</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Total Base Pay</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Total OT Pay</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Total Deductions</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Total Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {userGroups.map((group) => (
                    <tr key={group.user_id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-2 rounded-lg">
                            <Users className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-medium text-white">{group.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{group.department}</td>
                      <td className="py-3 px-4 text-right text-white">{group.entryCount}</td>
                      <td className="py-3 px-4 text-right text-white">{Number(group.totalHours).toFixed(2)}h</td>
                      <td className="py-3 px-4 text-right text-white">₱{Number(group.totalBaseSalary).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">₱{Number(group.totalOvertimePay).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-red-400">₱{Number(group.totalDeductions).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-white">₱{Number(group.totalSalary).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Detailed View
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-slate-700/50">
            <div className="bg-slate-700/50 px-6 py-4 border-b border-slate-600/50">
              <h3 className="text-lg font-semibold text-white">
                Payroll Report - {generationMode === 'week' 
                  ? `Week: ${formatDate(selectedWeek)} - ${formatDate(getWeekEnd(selectedWeek))}`
                  : selectedDates.length > 1 
                    ? `${selectedDates[0]} to ${selectedDates[selectedDates.length - 1]}`
                    : selectedDates[0]
                }
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {filteredPayrollData.length} entries • Total: ₱{Number(totalSalary).toFixed(2)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Department</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Time</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Hours</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Base Pay</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Overtime</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Deductions</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-300">Total</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-300">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredPayrollData.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-2 rounded-lg">
                            <Users className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-medium text-white">{entry.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{entry.department}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="text-slate-300">
                            In: {entry.clock_in_time ? new Date(entry.clock_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </p>
                          <p className="text-slate-400">
                            Out: {entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <div>
                          <p className="text-white">{Number(entry.total_hours).toFixed(2)}h</p>
                          {entry.overtime_hours > 0 && (
                            <p className="text-sm text-orange-400">+{Number(entry.overtime_hours).toFixed(2)}h OT</p>
                          )}
                          {entry.undertime_hours > 0 && (
                            <p className="text-sm text-red-400">-{Number(entry.undertime_hours).toFixed(2)}h late</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-white">₱{Number(entry.base_salary).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {entry.overtime_pay > 0 ? `₱${Number(entry.overtime_pay).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-red-400">
                        {entry.undertime_deduction}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-white">₱{Number(entry.total_salary).toFixed(2)}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.status === 'released' 
                            ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/50'
                            : 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/50'
                        }`}>
                          {entry.status === 'released' ? 'Released' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-900/30 transition-all duration-200"
                            title="Edit Entry"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingEntry(entry);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-900/30 transition-all duration-200"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (generationMode === 'week' && selectedWeek) || (generationMode === 'dates' && selectedDates.length > 0) ? (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Payroll Data</h3>
          <p className="text-slate-400">
            No payroll records found for the selected {generationMode === 'week' ? 'week' : 'dates'}. Generate payslips first.
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Calendar className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Select Period</h3>
          <p className="text-slate-400">
            Please select a {generationMode === 'week' ? 'week' : 'dates'} above to generate or view payroll reports.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-2xl border border-slate-700/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <Edit3 className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Edit Payroll Entry</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Clock In Time
                </label>
                <input
                  type="datetime-local"
                  value={editForm.clockIn}
                  onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Clock Out Time
                </label>
                <input
                  type="datetime-local"
                  value={editForm.clockOut}
                  onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
            </div>

            <div className="mb-6">
              <button
                onClick={calculateFromTimes}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Calculate from Times
              </button>
              <p className="text-xs text-slate-400 mt-2">
                This will automatically calculate hours and pay based on the clock in/out times using the 7:00 AM start rule.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Hours
                </label>
                <input
                  type="number"
                  value={editForm.totalHours}
                  onChange={(e) => setEditForm({ ...editForm, totalHours: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  value={editForm.overtimeHours}
                  onChange={(e) => setEditForm({ ...editForm, overtimeHours: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Undertime Hours
                </label>
                <input
                  type="number"
                  value={editForm.undertimeHours}
                  onChange={(e) => setEditForm({ ...editForm, undertimeHours: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Base Salary (₱)
                </label>
                <input
                  type="number"
                  value={editForm.baseSalary}
                  onChange={(e) => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Overtime Pay (₱)
                </label>
                <input
                  type="number"
                  value={editForm.overtimePay}
                  onChange={(e) => setEditForm({ ...editForm, overtimePay: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Undertime Deduction (₱)
                </label>
                <input
                  type="number"
                  value={editForm.undertimeDeduction}
                  onChange={(e) => setEditForm({ ...editForm, undertimeDeduction: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Staff House Deduction (₱)
                </label>
                <input
                  type="number"
                  value={editForm.staffHouseDeduction}
                  onChange={(e) => setEditForm({ ...editForm, staffHouseDeduction: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  step="0.01"
                />
              </div>
            </div>

            {/* Total Calculation Display */}
            <div className="bg-slate-700/30 p-4 rounded-lg mb-6 border border-slate-600/50">
              <h4 className="font-medium text-white mb-2">Calculated Total</h4>
              <div className="text-2xl font-bold text-emerald-400">
                ₱{(editForm.baseSalary + editForm.overtimePay - editForm.undertimeDeduction).toFixed(2)}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Base (₱{Number(editForm.baseSalary).toFixed(2)}) + Overtime (₱{Number(editForm.overtimePay).toFixed(2)}) - Deductions (₱{Number(editForm.undertimeDeduction).toFixed(2)})
              </p>
            </div>

            {/* Important Note */}
            <div className="bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-800/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400 mb-1">Payroll Calculation Rules</p>
                  <ul className="text-xs text-blue-300 space-y-1">
                    <li>• Work hours only count from 7:00 AM onwards</li>
                    <li>• Base pay is always ₱200, deductions applied for undertime</li>
                    <li>• Overtime rate is ₱35/hour after 3:30 PM</li>
                    <li>• Late clock-in (after 7:00 AM) incurs undertime deduction</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEntry(null);
                }}
                className="flex-1 bg-slate-700/50 text-slate-300 py-3 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedEntry}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingEntry && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Delete Payroll Entry</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-300 mb-2">
                Are you sure you want to delete the payroll entry for <strong className="text-white">{deletingEntry.username}</strong>?
              </p>
              <div className="bg-red-900/20 p-3 rounded-lg border border-red-800/50">
                <p className="text-sm text-red-400">
                  <strong>Warning:</strong> This action cannot be undone. The payroll entry will be permanently deleted.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingEntry(null);
                }}
                className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-4 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntry}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
