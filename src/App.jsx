import { useState, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { logout as apiLogout } from './api/api';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Landing
import LandingPage from './pages/landing/LandingPage';

// Auth
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ContactSupport from './pages/auth/ContactSupport';

// Components
import AdminHeader from './components/AdminHeader';

// Admin
import AdminSidebar from './pages/admin/AdminSidebar';
import AdminDashboardOverview from './pages/admin/AdminDashboardOverview';
import AdminTripApprovals from './pages/admin/AdminTripApprovals';
import ManageVehiclesPage from './pages/admin/ManageVehiclesPage';
import AddVehicle from './pages/admin/AddVehicle';
import VehicleStatus from './pages/admin/VehicleStatus';
import VehicleTripHistory from './pages/admin/VehicleTripHistory';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import AddUser from './pages/admin/AddUser';
import ManageDrivers from './pages/admin/ManageDrivers';
import ContactMessages from './pages/admin/ContactMessages';
import PasswordResetManagement from './pages/admin/PasswordResetManagement';
import UserRequestReport from './pages/admin/UserRequestReport';
import VehicleTripReport from './pages/admin/VehicleTripReport';
import DriverTripReport from './pages/admin/DriverTripReport';
import DriverPerformanceReport from './pages/admin/DriverPerformanceReport';
import FuelRecordsReport from './pages/admin/FuelRecordsReport';
import Settings from './pages/admin/Settings';
import MaintenanceReportsAdmin from './pages/admin/MaintenanceReportsAdmin';

// Transport Officer
import TransportOfficerLayout from './pages/transportOfficer/TransportOfficerLayout';
import TransportDashboard from './pages/transportOfficer/TransportDashboard';
import Requests from './pages/transportOfficer/Requests';
import TripManagement from './pages/transportOfficer/TripManagement';
import VehicleTracking from './pages/transportOfficer/VehicleTracking';
import DriverCoordination from './pages/transportOfficer/DriverCoordination';
import TransportComplaints from './pages/transportOfficer/TransportComplaints';
import ComplaintHistory from './pages/transportOfficer/ComplaintHistory';
import TransportReports from './pages/transportOfficer/TransportReports';
import FuelApprovals from './pages/transportOfficer/FuelApprovals';

// Driver
import DriverLayout from './pages/driver/DriverLayout';
import NewDriverDashboard from './pages/driver/NewDriverDashboard';
import DriverTrips from './pages/driver/DriverTrips';
import DriverSchedule from './pages/driver/DriverSchedule';
import DriverInspection from './pages/driver/DriverInspection';
import DriverFuelLog from './pages/driver/DriverFuelLog';
import DriverMaintenance from './pages/driver/DriverMaintenance';
import DriverComplaints from './pages/driver/DriverComplaints';
import DriverProfile from './pages/driver/DriverProfile';
import DriverFuelRequest from './pages/driver/DriverFuelRequest';

// User
import UserLayout from './pages/user/UserLayout';
import UserDashboard from './pages/user/UserDashboard';
import UserProfile from './pages/user/UserProfile';
import SubmitVehicleRequest from './pages/user/SubmitVehicleRequest';
import RequestStatus from './pages/user/RequestStatus';
import SubmitComplaint from './pages/user/SubmitComplaint';
import Notifications from './pages/user/Notifications';

// Fuel Station Officer
import FuelStationLayout from './pages/fuelStationOfficer/FuelStationLayout';
import FuelDashboard from './pages/fuelStationOfficer/FuelDashboard';
import FuelRequests from './pages/fuelStationOfficer/FuelRequests';
import FuelDispenseForm from './pages/fuelStationOfficer/FuelDispenseForm';
import FuelInventory from './pages/fuelStationOfficer/FuelInventory';
import FuelTransactionHistory from './pages/fuelStationOfficer/FuelTransactionHistory';
import FuelReports from './pages/fuelStationOfficer/FuelReports';
import FuelNotifications from './pages/fuelStationOfficer/FuelNotifications';
import FuelStationProfile from './pages/fuelStationOfficer/FuelStationProfile';
import FuelStationSettings from './pages/fuelStationOfficer/FuelStationSettings';

// Gate Security (legacy components kept for reference)
import GateSecurityProfile from './pages/GateSecurity/GateSecurityProfile';
// New Gate Security Module
import GateLayout from './pages/GateSecurity/GateLayout';
import GateSecurityDashboard from './pages/GateSecurity/GateSecurityDashboard';
import VehicleCheck from './pages/GateSecurity/VehicleCheck';
import GateLogsPage from './pages/GateSecurity/GateLogsPage';
import IncidentReportPage from './pages/GateSecurity/IncidentReportPage';
import GateAlertsPage from './pages/GateSecurity/GateAlertsPage';
import QRScanner from './pages/GateSecurity/QRScanner';

// Maintenance Officer
import MaintenanceLayout from './pages/maintenance/MaintenanceLayout';
import MaintenanceDashboard from './pages/maintenance/MaintenanceDashboard';
import IssueList from './pages/maintenance/IssueList';
import RepairTracking from './pages/maintenance/RepairTracking';
import ScheduleMaintenance from './pages/maintenance/ScheduleMaintenance';
import InventoryManagement from './pages/maintenance/InventoryManagement';
import MaintenanceReports from './pages/maintenance/MaintenanceReports';
import MaintenanceProfile from './pages/maintenance/MaintenanceProfile';

function App() {
  const { user, setUser } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (userData) => {
    // Use the full user object from localStorage (set by api.js login)
    try {
      const stored = localStorage.getItem('user');
      const fullUser = stored ? JSON.parse(stored) : userData;
      setUser(fullUser);
    } catch {
      setUser(userData);
    }
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    navigate('/');
  };

  return (
    <Routes>
      {/* Landing Page - Always accessible */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/contact-support" element={<ContactSupport />} />

      {!user && (
        <>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}

      {/* Admin Routes */}
      {user?.role === 'ADMIN' && (
        <>
          <Route path="/admin" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <AdminDashboardOverview />
              </div>
            </div>
          } />
          <Route path="/admin/dashboard" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <AdminDashboardOverview />
              </div>
            </div>
          } />
          <Route path="/admin/trip-approvals" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <AdminTripApprovals />
              </div>
            </div>
          } />
          <Route path="/admin/manage-vehicles" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <ManageVehiclesPage />
              </div>
            </div>
          } />
          <Route path="/admin/vehicle-status" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <VehicleStatus />
              </div>
            </div>
          } />
          <Route path="/admin/add-vehicle" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <AddVehicle />
              </div>
            </div>
          } />
          <Route path="/admin/vehicle-trip-history" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <VehicleTripHistory />
              </div>
            </div>
          } />
          <Route path="/admin/manage-users" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <ManageUsersPage />
              </div>
            </div>
          } />
          <Route path="/admin/add-user" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <AddUser />
              </div>
            </div>
          } />
          <Route path="/admin/manage-drivers" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <ManageDrivers />
              </div>
            </div>
          } />
          <Route path="/admin/user-request-report" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <UserRequestReport />
              </div>
            </div>
          } />
          <Route path="/admin/vehicle-trip-report" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <VehicleTripReport />
              </div>
            </div>
          } />
          <Route path="/admin/driver-trip-report" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <DriverTripReport />
              </div>
            </div>
          } />
          <Route path="/admin/driver-performance-report" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <DriverPerformanceReport />
              </div>
            </div>
          } />
          <Route path="/admin/fuel-records-report" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <FuelRecordsReport />
              </div>
            </div>
          } />
          <Route path="/admin/fuel-approvals" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <FuelApprovals />
              </div>
            </div>
          } />
          <Route path="/admin/settings" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <Settings />
              </div>
            </div>
          } />
          <Route path="/admin/contact-messages" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <ContactMessages />
              </div>
            </div>
          } />
          <Route path="/admin/maintenance-reports" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <MaintenanceReportsAdmin />
              </div>
            </div>
          } />
          <Route path="/admin/password-reset-management" element={
            <div className="app">
              <AdminSidebar onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />
              <div className={`main-content${sidebarCollapsed ? " main-content-collapsed" : ""}`}>
                <AdminHeader />
                <PasswordResetManagement />
              </div>
            </div>
          } />
        </>
      )}

      {/* Transport Officer Routes */}
      {user?.role === 'TRANSPORT' && (
        <>
          <Route path="/transport/*" element={<TransportOfficerLayout onLogout={handleLogout} />}>
            <Route path="dashboard" element={<TransportDashboard />} />
            <Route path="requests" element={<Requests />} />
            <Route path="trips" element={<TripManagement />} />
            <Route path="tracking" element={<VehicleTracking />} />
            <Route path="drivers" element={<DriverCoordination />} />
            <Route path="complaints" element={<TransportComplaints />} />
            <Route path="complaint-history" element={<ComplaintHistory />} />
            <Route path="reports" element={<TransportReports />} />
            <Route path="fuel-approvals" element={<FuelApprovals />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/transport/dashboard" replace />} />
        </>
      )}

      {/* Driver Routes */}
      {user?.role === 'DRIVER' && (
        <>
          <Route path="/driver" element={<DriverLayout onLogout={handleLogout} />}>
            <Route index element={<NewDriverDashboard />} />
            <Route path="dashboard"   element={<NewDriverDashboard />} />
            <Route path="trips"       element={<DriverTrips />} />
            <Route path="schedule"    element={<DriverSchedule />} />
            <Route path="inspection"  element={<DriverInspection />} />
            <Route path="fuel"        element={<DriverFuelLog />} />
            <Route path="fuel-request" element={<DriverFuelRequest />} />
            <Route path="maintenance" element={<DriverMaintenance />} />
            <Route path="complaints"  element={<DriverComplaints />} />
            <Route path="profile"     element={<DriverProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/driver/dashboard" replace />} />
        </>
      )}

      {/* User Routes */}
      {user?.role === 'USER' && (
        <>
          <Route path="/user" element={<UserLayout onLogout={handleLogout} />}>
            <Route index element={<UserDashboard />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="request-vehicle" element={<SubmitVehicleRequest />} />
            <Route path="my-requests" element={<RequestStatus />} />
            <Route path="submit-complaint" element={<SubmitComplaint />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="settings" element={<UserProfile />} />
          </Route>
        </>
      )}

      {/* Fuel Station Officer Routes */}
      {user?.role === 'FUEL_OFFICER' && (
        <>
          <Route path="/fuel" element={<FuelStationLayout onLogout={handleLogout} />}>
            <Route index element={<Navigate to="/fuel/dashboard" replace />} />
            <Route path="dashboard" element={<FuelDashboard />} />
            <Route path="requests" element={<FuelRequests />} />
            <Route path="inventory" element={<FuelInventory />} />
            <Route path="reports" element={<FuelReports />} />
            <Route path="notifications" element={<FuelNotifications />} />
            <Route path="profile" element={<FuelStationProfile />} />
            <Route path="settings" element={<FuelStationSettings />} />
            <Route path="performance" element={<FuelDashboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/fuel/dashboard" replace />} />
        </>
      )}

      {/* Gate Security Routes */}
      {user?.role === 'GATE_OFFICER' && (
        <>
          <Route path="/gate" element={<GateLayout onLogout={handleLogout} />}>
            <Route index element={<GateSecurityDashboard />} />
            <Route path="dashboard"  element={<GateSecurityDashboard />} />
            <Route path="verify"     element={<VehicleCheck />} />
            <Route path="logs"       element={<GateLogsPage />} />
            <Route path="incidents"  element={<IncidentReportPage />} />
            <Route path="alerts"     element={<GateAlertsPage />} />
            <Route path="qr-scan"    element={<QRScanner />} />
            <Route path="scan/:token" element={<QRScanner />} />
            <Route path="profile"    element={<GateSecurityProfile />} />
          </Route>
          <Route path="/gate/*" element={<Navigate to="/gate/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/gate/dashboard" replace />} />
        </>
      )}

      {/* Maintenance Officer Routes */}
      {user?.role === 'MAINTENANCE_OFFICER' && (
        <>
          <Route path="/maintenance" element={<MaintenanceLayout onLogout={handleLogout} />}>
            <Route index element={<MaintenanceDashboard />} />
            <Route path="dashboard"  element={<MaintenanceDashboard />} />
            <Route path="issues"     element={<IssueList />} />
            <Route path="repair"     element={<RepairTracking />} />
            <Route path="schedule"   element={<ScheduleMaintenance />} />
            <Route path="inventory"  element={<InventoryManagement />} />
            <Route path="reports"    element={<MaintenanceReports />} />
            <Route path="profile"    element={<MaintenanceProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/maintenance/dashboard" replace />} />
        </>
      )}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

