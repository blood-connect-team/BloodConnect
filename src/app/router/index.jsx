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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },
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
    ],
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [{ index: true, element: <Dashboard /> }],
      },
    ],
  },
]);
