import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import React, { Suspense, lazy } from 'react';
import './App.css';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Home = lazy(() => import('./pages/Home'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const AllTransactions = lazy(() => import('./pages/AllTransactions'));
const TransactionDetail = lazy(() => import('./pages/TransactionDetail'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const Settings = lazy(() => import('./pages/Settings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Income = lazy(() => import('./pages/Income'));
const Transfers = lazy(() => import('./pages/Transfers'));
const Categories = lazy(() => import('./pages/Categories'));
const CategoryAnalytics = lazy(() => import('./pages/CategoryAnalytics'));
const Budgets = lazy(() => import('./pages/Budgets'));

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
            <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
            <Route path="/transfers" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/category-analytics" element={<ProtectedRoute><CategoryAnalytics /></ProtectedRoute>} />
            <Route path="/accounts/:accountId/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
          <Route path="/accounts/:accountId/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;