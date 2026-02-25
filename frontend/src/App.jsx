import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import React, { Suspense, lazy } from 'react';
import './App.css';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Home = lazy(() => import('./pages/Home'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AllTransactions = lazy(() => import('./pages/AllTransactions'));
const TransactionDetail = lazy(() => import('./pages/TransactionDetail'));
const Settings = lazy(() => import('./pages/Settings'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/accounts/:accountId"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/accounts/:accountId/transactions" element={<ProtectedRoute><AllTransactions /></ProtectedRoute>} />
          <Route path="/accounts/:accountId/transaction/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
          <Route path="/accounts/:accountId/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;