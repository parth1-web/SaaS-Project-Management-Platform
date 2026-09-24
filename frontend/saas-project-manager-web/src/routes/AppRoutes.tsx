import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Organizations from '../pages/Organizations';
import OrganizationDetails from '../pages/OrganizationDetails';
import Projects from '../pages/Projects';
import ProjectDetails from '../pages/ProjectDetails';
import TaskBoard from '../pages/TaskBoard';
import TaskDetails from '../pages/TaskDetails';
import Notifications from '../pages/Notifications';
import Activity from '../pages/Activity';
import MyTasks from '../pages/MyTasks';
import { Profile, Settings } from '../pages/ProfileSettings';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/my-tasks" element={<ProtectedRoute><Layout><MyTasks /></Layout></ProtectedRoute>} />
      <Route path="/organizations" element={<ProtectedRoute><Layout><Organizations /></Layout></ProtectedRoute>} />
      <Route path="/organizations/:id" element={<ProtectedRoute><Layout><OrganizationDetails /></Layout></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><Layout><ProjectDetails /></Layout></ProtectedRoute>} />
      <Route path="/projects/:id/tasks" element={<ProtectedRoute><Layout><TaskBoard /></Layout></ProtectedRoute>} />
      <Route path="/tasks/:id" element={<ProtectedRoute><Layout><TaskDetails /></Layout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Layout><Activity /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
