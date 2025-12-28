import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRole?: 'admin' | 'employee' }> = ({ children, allowedRole }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Carregando...</div>;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRole && role !== allowedRole) {
     // If employee tries to access admin, redirect to employee dash
     // If admin, they can access everything usually.
     // If role is admin, we allow access even if allowedRole is something else (optional logic, but typically admin has full access)
     // or we strict check. The original code implied strict check but allowed admin bypass?
     // "role !== 'admin'" check implies if user is admin, they don't get redirected.
     if (role !== 'admin') {
       return <Navigate to="/" replace />;
     }
  }

  return <>{children}</>;
};

const RootRedirect = () => {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/employee" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/employee" element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <RootRedirect />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}