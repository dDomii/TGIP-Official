// Simple test script to debug payslip release issue
const fetch = require('node-fetch');

const API_BASE_URL = 'http://192.168.100.60:3001';

async function testDebug() {
  try {
    // Test the debug endpoint
    const response = await fetch(`${API_BASE_URL}/api/debug/payslips`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    const data = await response.json();
    console.log('Debug Info:', data);
    
    // Test current week dates
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    
    console.log('Current week start:', weekStart.toISOString().split('T')[0]);
    console.log('Current week end:', weekEnd.toISOString().split('T')[0]);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDebug(); 