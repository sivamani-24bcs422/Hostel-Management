import { Route, Routes } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { ProtectedRoute, PublicRoute, RoleRoute } from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import StudentsPage from '../pages/StudentsPage';
import WardensPage from '../pages/WardensPage';
import HostelsPage from '../pages/HostelsPage';
import RoomsPage from '../pages/RoomsPage';
import AllocationsPage from '../pages/AllocationsPage';
import FeesPage from '../pages/FeesPage';
import PaymentsPage from '../pages/PaymentsPage';
import AttendancePage from '../pages/AttendancePage';
import ComplaintsPage from '../pages/ComplaintsPage';
import VisitorsPage from '../pages/VisitorsPage';
import AnnouncementsPage from '../pages/AnnouncementsPage';
import ReportsPage from '../pages/ReportsPage';
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';

const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      }
    />

    <Route
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route
        path="students"
        element={
          <RoleRoute roles={['admin', 'warden']}>
            <StudentsPage />
          </RoleRoute>
        }
      />
      <Route
        path="wardens"
        element={
          <RoleRoute roles={['admin']}>
            <WardensPage />
          </RoleRoute>
        }
      />
      <Route
        path="hostels"
        element={
          <RoleRoute roles={['admin', 'warden']}>
            <HostelsPage />
          </RoleRoute>
        }
      />
      <Route
        path="rooms"
        element={
          <RoleRoute roles={['admin', 'warden']}>
            <RoomsPage />
          </RoleRoute>
        }
      />
      <Route
        path="allocations"
        element={
          <RoleRoute roles={['admin', 'warden', 'student']}>
            <AllocationsPage />
          </RoleRoute>
        }
      />
      <Route
        path="fees"
        element={
          <RoleRoute roles={['admin', 'warden', 'student']}>
            <FeesPage />
          </RoleRoute>
        }
      />
      <Route
        path="payments"
        element={
          <RoleRoute roles={['admin', 'warden', 'student']}>
            <PaymentsPage />
          </RoleRoute>
        }
      />
      <Route
        path="attendance"
        element={
          <RoleRoute roles={['admin', 'warden', 'student']}>
            <AttendancePage />
          </RoleRoute>
        }
      />
      <Route
        path="complaints"
        element={
          <RoleRoute roles={['admin', 'warden', 'student']}>
            <ComplaintsPage />
          </RoleRoute>
        }
      />
      <Route
        path="visitors"
        element={
          <RoleRoute roles={['admin', 'warden']}>
            <VisitorsPage />
          </RoleRoute>
        }
      />
      <Route
        path="announcements"
        element={
          <RoleRoute roles={['admin', 'warden', 'student']}>
            <AnnouncementsPage />
          </RoleRoute>
        }
      />
      <Route
        path="reports"
        element={
          <RoleRoute roles={['admin']}>
            <ReportsPage />
          </RoleRoute>
        }
      />
      <Route path="profile" element={<ProfilePage />} />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default AppRoutes;
