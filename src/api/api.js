// VITE_API_URL must be set as an environment variable on your hosting platform.
// For local dev: create a .env file with VITE_API_URL=http://localhost:5000/api
// For production: set VITE_API_URL=https://hu-vms-backend.onrender.com/api in Render
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ─── Auth ────────────────────────────────────────────────
export const login = async (username, password, role = null) => {
  const body = { username, password };
  if (role) body.role = role;
  
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// ─── Requests ────────────────────────────────────────────
export const getRequests = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${BASE_URL}/requests?${params}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const createRequest = async (requestData) => {
  const res = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(requestData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateRequest = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/requests/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const assignRequest = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/requests/${id}/assign`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const approveRequest = async (id, payload) => {
  const res = await fetch(`${BASE_URL}/requests/${id}/approve`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const rejectRequest = async (id, rejectionReason) => {
  const res = await fetch(`${BASE_URL}/requests/${id}/reject`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ rejectionReason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const startTrip = async (id) => {
  const res = await fetch(`${BASE_URL}/requests/${id}/start`, {
    method: 'PUT',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const completeTrip = async (id) => {
  const res = await fetch(`${BASE_URL}/requests/${id}/complete`, {
    method: 'PUT',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const deleteRequest = async (id) => {
  const res = await fetch(`${BASE_URL}/requests/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Vehicles ────────────────────────────────────────────
export const createVehicle = async (vehicleData) => {
  const res = await fetch(`${BASE_URL}/vehicles`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(vehicleData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getVehicles = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${BASE_URL}/vehicles?${params}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateVehicle = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/vehicles/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Drivers ─────────────────────────────────────────────
export const getDrivers = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${BASE_URL}/drivers?${params}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const createDriver = async (driverData) => {
  const res = await fetch(`${BASE_URL}/drivers`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(driverData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Users ───────────────────────────────────────────────
export const getMe = async () => {
  const res = await fetch(`${BASE_URL}/users/me`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateMe = async (updates) => {
  const res = await fetch(`${BASE_URL}/users/me`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const res = await fetch(`${BASE_URL}/users/me/change-password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getUsers = async () => {
  const res = await fetch(`${BASE_URL}/users`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Additional helpers ───────────────────────────────────
export const registerUser = async (userData) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const deleteUser = async (id) => {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateUser = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const resetUserPassword = async (id, newPassword) => {
  const res = await fetch(`${BASE_URL}/users/${id}/reset-password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const resetUsername = async (id, newUsername) => {
  const res = await fetch(`${BASE_URL}/users/${id}/reset-username`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ newUsername }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const deleteVehicle = async (id) => {
  const res = await fetch(`${BASE_URL}/vehicles/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const deleteDriver = async (id) => {
  const res = await fetch(`${BASE_URL}/drivers/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateDriver = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/drivers/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Reports ─────────────────────────────────────────────
export const getVehicleUsageReport = async () => {
  const res = await fetch(`${BASE_URL}/reports/vehicle-usage`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getDriverActivityReport = async () => {
  const res = await fetch(`${BASE_URL}/reports/driver-activity`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getRequestsSummaryReport = async () => {
  const res = await fetch(`${BASE_URL}/reports/requests-summary`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const sendReport = async (payload) => {
  const res = await fetch(`${BASE_URL}/reports/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getReceivedReports = async () => {
  const res = await fetch(`${BASE_URL}/reports/received`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const submitReportRequest = async (payload) => {
  const res = await fetch(`${BASE_URL}/reports/request`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getReportRequests = async () => {
  const res = await fetch(`${BASE_URL}/reports/requests`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateReportRequest = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/reports/requests/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Complaints ───────────────────────────────────────────
export const getComplaints = async () => {
  const res = await fetch(`${BASE_URL}/complaints`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const createComplaint = async (payload) => {
  const res = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateComplaint = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/complaints/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Fuel Records ─────────────────────────────────────────
export const getFuelRecords = async () => {
  const res = await fetch(`${BASE_URL}/fuel`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const createFuelRecord = async (payload) => {
  const res = await fetch(`${BASE_URL}/fuel`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const deleteFuelRecord = async (id) => {
  const res = await fetch(`${BASE_URL}/fuel/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Fuel Requests ────────────────────────────────────────
export const getFuelRequests = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${BASE_URL}/fuel-requests?${params}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const createFuelRequest = async (payload) => {
  const res = await fetch(`${BASE_URL}/fuel-requests`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const approveFuelRequest = async (id, permittedLiters, approvedBy) => {
  const res = await fetch(`${BASE_URL}/fuel-requests/${id}/approve`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ permittedLiters, approvedBy }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const rejectFuelRequest = async (id, rejectionReason) => {
  const res = await fetch(`${BASE_URL}/fuel-requests/${id}/reject`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ rejectionReason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const dispenseFuel = async (id, dispensedLiters, dispensedBy, approvalKey) => {
  const res = await fetch(`${BASE_URL}/fuel-requests/${id}/dispense`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ dispensedLiters, dispensedBy, approvalKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ─── Fuel Inventory ───────────────────────────────────────
export const getFuelInventory = async () => {
  const res = await fetch(`${BASE_URL}/fuel-inventory`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateFuelInventory = async (fuelType, updates) => {
  const res = await fetch(`${BASE_URL}/fuel-inventory/${fuelType}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const confirmFuelReceipt = async (id) => {
  const res = await fetch(`${BASE_URL}/fuel-requests/${id}/confirm`, {
    method: 'PUT',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};
