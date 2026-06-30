import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../store/slices/authSlice';
import { validateLoginForm } from '../../utils/validation';
import {
  getFieldError,
  isAuthenticationError,
  isDuplicateError,
  getUserFriendlyMessage,
} from '../../utils/errorHandler';
import { logger } from '../../utils/logger';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  useEffect(() => {
    dispatch(clearError());
    setApiErrorMessage('');
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiErrorMessage) {
      setApiErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationResult = validateLoginForm(formData);
    if (validationResult !== null) {
      setValidationErrors(validationResult);
      logger.debug('Login form validation failed', validationResult);
      return;
    }

    setValidationErrors({});
    setApiErrorMessage('');

    const result = await dispatch(loginUser(formData));

    if (loginUser.fulfilled.match(result)) {
      logger.info('Login successful, redirecting to dashboard');
      navigate('/', { replace: true });
    } else if (loginUser.rejected.match(result)) {
      const error = result.payload;
      logger.error('Login failed:', error);

      if (isAuthenticationError(error)) {
        setApiErrorMessage('Invalid email or password. Please try again.');
      } else if (error?.response?.status === 401) {
        setApiErrorMessage('Invalid credentials. Please check your email and password.');
      } else {
        setApiErrorMessage(getUserFriendlyMessage(error, 'Failed to login. Please try again.'));
      }
    }
  };

  const displayError = apiErrorMessage || error;

  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 via-white to-background flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-primary-600 mb-2'>Expense Manager</h1>
          <p className='text-gray-600'>Manage your finances with ease</p>
        </div>

        <div className='card fade-in'>
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>Welcome Back</h2>

          {displayError && (
            <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-danger text-sm'>{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1'>
                Email Address
              </label>
              <input
                type='email'
                id='email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                className={`input ${validationErrors.email ? 'input-error' : ''}`}
                placeholder='you@example.com'
                disabled={loading}
                autoComplete='email'
              />
              {validationErrors.email && <p className='error-message'>{validationErrors.email}</p>}
            </div>

            <div>
              <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-1'>
                Password
              </label>
              <input
                type='password'
                id='password'
                name='password'
                value={formData.password}
                onChange={handleChange}
                className={`input ${validationErrors.password ? 'input-error' : ''}`}
                placeholder='••••••••'
                disabled={loading}
                autoComplete='current-password'
              />
              {validationErrors.password && (
                <p className='error-message'>{validationErrors.password}</p>
              )}
            </div>

            <button type='submit' disabled={loading} className='btn btn-primary w-full'>
              {loading ? (
                <span className='flex items-center justify-center'>
                  <div
                    className='spinner mr-2'
                    style={{ width: '16px', height: '16px', borderWidth: '2px' }}
                  ></div>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-600'>
              Don't have an account?{' '}
              <Link to='/register' className='link'>
                Create one now
              </Link>
            </p>
          </div>
        </div>

        <p className='text-center text-sm text-gray-500 mt-6'>
          © 2024 Expense Manager. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
