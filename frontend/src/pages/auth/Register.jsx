import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { validateRegistrationForm } from '../../utils/validation';
import { isDuplicateError, getUserFriendlyMessage } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    const validationResult = validateRegistrationForm(formData);
    if (validationResult !== null) {
      setValidationErrors(validationResult);
      logger.debug('Registration form validation failed', validationResult);
      return;
    }

    setValidationErrors({});
    setApiErrorMessage('');

    const { confirmPassword, ...registerData } = formData;
    const result = await dispatch(registerUser(registerData));

    if (registerUser.fulfilled.match(result)) {
      logger.info('Registration successful, redirecting to dashboard');
      navigate('/', { replace: true });
    } else if (registerUser.rejected.match(result)) {
      const error = result.payload;
      logger.error('Registration failed:', error);

      if (isDuplicateError(error)) {
        setApiErrorMessage(
          'Email address is already registered. Please use a different email or login instead.',
        );
      } else if (error?.response?.status === 409) {
        setApiErrorMessage(
          'This email is already in use. Please try with a different email address.',
        );
      } else {
        setApiErrorMessage(
          getUserFriendlyMessage(error, 'Failed to create account. Please try again.'),
        );
      }
    }
  };

  const displayError = apiErrorMessage || error;

  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 via-white to-background flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-primary-600 mb-2'>Expense Manager</h1>
          <p className='text-gray-600'>Start managing your expenses today</p>
        </div>

        <div className='card fade-in'>
          <h2 className='text-2xl font-bold text-gray-900 mb-6'>Create Account</h2>

          {displayError && (
            <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-danger text-sm'>{displayError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label htmlFor='name' className='block text-sm font-medium text-gray-700 mb-1'>
                Full Name
              </label>
              <input
                type='text'
                id='name'
                name='name'
                value={formData.name}
                onChange={handleChange}
                className={`input ${validationErrors.name ? 'input-error' : ''}`}
                placeholder='John Doe'
                disabled={loading}
                autoComplete='name'
              />
              {validationErrors.name && <p className='error-message'>{validationErrors.name}</p>}
            </div>

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
                autoComplete='new-password'
              />
              {validationErrors.password && (
                <p className='error-message'>{validationErrors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor='confirmPassword'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Confirm Password
              </label>
              <input
                type='password'
                id='confirmPassword'
                name='confirmPassword'
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input ${validationErrors.confirmPassword ? 'input-error' : ''}`}
                placeholder='••••••••'
                disabled={loading}
                autoComplete='new-password'
              />
              {validationErrors.confirmPassword && (
                <p className='error-message'>{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button type='submit' disabled={loading} className='btn btn-primary w-full'>
              {loading ? (
                <span className='flex items-center justify-center'>
                  <div
                    className='spinner mr-2'
                    style={{ width: '16px', height: '16px', borderWidth: '2px' }}
                  ></div>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className='mt-6 text-center'>
            <p className='text-sm text-gray-600'>
              Already have an account?{' '}
              <Link to='/login' className='link'>
                Login here
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

export default Register;
