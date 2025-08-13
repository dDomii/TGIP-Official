// API Configuration
export const API_BASE_URL = 'http://192.168.100.60:3001';

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/login`,
  
  // Time tracking endpoints
  CLOCK_IN: `${API_BASE_URL}/api/clock-in`,
  CLOCK_OUT: `${API_BASE_URL}/api/clock-out`,
  RESET_CLOCK_IN: `${API_BASE_URL}/api/reset-clock-in`,
  TODAY_ENTRY: `${API_BASE_URL}/api/today-entry`,
  
  // User endpoints
  USERS: `${API_BASE_URL}/api/users`,
  USER_PAYROLL_HISTORY: `${API_BASE_URL}/api/user-payroll-history`,
  USER_HOURS_PROGRESS: `${API_BASE_URL}/api/user-hours-progress`,
  USER_REQUIRED_HOURS: `${API_BASE_URL}/api/user-required-hours`,
  USER_MANUAL_ENTRY: (id: string) => `${API_BASE_URL}/api/users/${id}/manual-entry`,
  
  // Overtime endpoints
  OVERTIME_REQUESTS: `${API_BASE_URL}/api/overtime-requests`,
  OVERTIME_REQUEST: `${API_BASE_URL}/api/overtime-request`,
  OVERTIME_NOTIFICATIONS: `${API_BASE_URL}/api/overtime-notifications`,
  
  // Admin overtime endpoints
  OVERTIME_APPROVE: (id: string) => `${API_BASE_URL}/api/overtime-requests/${id}/approve`,
  
  // Payroll endpoints
  PAYSLIPS_GENERATE: `${API_BASE_URL}/api/payslips/generate`,
  PAYSLIPS_RELEASE: `${API_BASE_URL}/api/payslips/release`,
  PAYROLL_REPORT: `${API_BASE_URL}/api/payroll-report`,
  PAYROLL: `${API_BASE_URL}/api/payroll`,
  
  // Logs endpoints
  TIME_LOGS: `${API_BASE_URL}/api/time-logs`,
  PAYSLIP_LOGS: `${API_BASE_URL}/api/payslip-logs`,
  
  
  // Live reports
  ACTIVE_USERS: `${API_BASE_URL}/api/active-users`,
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string, params?: Record<string, string | number>) => {
  let url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};