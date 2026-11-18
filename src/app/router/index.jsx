import { createBrowserRouter } from 'react-router-dom';

// Layouts
import { MainLayout } from '../layouts/MainLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Pages
import Landing from '../../pages/Landing';
import Register from '../../pages/Register';
import Login from '../../pages/Login';
import Dashboard from '../../pages/Dashboard';
import EmergencyRequest from '../../pages/EmergencyRequest';
import Notifications from '../../pages/Notifications';
import Admin from '../../pages/Admin';
import Confirmation from '../../pages/Confirmation';
import NotFound from '../../pages/NotFound';
import ErrorPage from '../../pages/ErrorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'confirmation', element: <Confirmation /> },
      { path: 'notifications', element: <Notifications /> },
      {
        // Logged in, profile not required yet: this is where the profile is completed.
        element: <ProtectedRoute requireProfile={false} />,
        children: [{ path: 'register', element: <Register /> }],
      },
      {
        // Creating a request needs an account and a profile (#25).
        element: <ProtectedRoute />,
        children: [{ path: 'request', element: <EmergencyRequest /> }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <DashboardLayout />,
        // Unknown /dashboard/... paths show the 404 only after the auth guard has passed.
        children: [{ index: true, element: <Dashboard /> }, { path: '*', element: <NotFound /> }],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute />, // admin role check: #19
    errorElement: <ErrorPage />,
    children: [
      {
        element: <MainLayout />,
        children: [{ index: true, element: <Admin /> }],
      },
    ],
  },
]);
