import { createBrowserRouter } from 'react-router-dom';

// Layouts
import { MainLayout } from '../layouts/MainLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { Loader } from '../../components/common/Loader';

// Pages are loaded on demand: each one becomes its own chunk (#41).
const page = (load) => ({ lazy: async () => ({ Component: (await load()).default }) });
const Landing = page(() => import('../../pages/Landing'));
const Register = page(() => import('../../pages/Register'));
const Login = page(() => import('../../pages/Login'));
const Dashboard = page(() => import('../../pages/Dashboard'));
const EmergencyRequest = page(() => import('../../pages/EmergencyRequest'));
const Notifications = page(() => import('../../pages/Notifications'));
const Admin = page(() => import('../../pages/Admin'));
const Confirmation = page(() => import('../../pages/Confirmation'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    HydrateFallback: Loader,
    children: [
      { index: true, ...Landing },
      { path: 'login', ...Login },
      { path: 'confirmation', ...Confirmation },
      { path: 'notifications', ...Notifications },
      {
        // Logged in, profile not required yet: this is where the profile is completed.
        element: <ProtectedRoute requireProfile={false} />,
        children: [{ path: 'register', ...Register }],
      },
      {
        // Creating a request needs an account and a profile (#25).
        element: <ProtectedRoute />,
        children: [{ path: 'request', ...EmergencyRequest }],
      },
    ],
  },
  {
    path: '/dashboard',
    HydrateFallback: Loader,
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [{ index: true, ...Dashboard }],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute />, // admin role check: #19
    children: [
      {
        element: <MainLayout />,
        children: [{ index: true, ...Admin }],
      },
    ],
  },
]);
