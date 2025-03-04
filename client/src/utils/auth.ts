import api from './api';

/**
 * Sets the Authorization header for all API requests
 * @param token JWT token
 */
export const setAuthToken = (token: string) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Removes the Authorization header from API requests
 */
export const removeAuthToken = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('token');
};

/**
 * Checks if the current user has admin privileges
 * @param user User object
 * @returns Boolean indicating if user is admin
 */
export const isAdmin = (user: any | null): boolean => {
  return user && user.role === 'admin';
};

/**
 * Checks if the JWT token is still valid
 * @returns Boolean indicating if token is valid
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return false;
  }
  
  try {
    // A very simple validation - in production you would want to check expiration
    // This is a placeholder for more complex token validation logic
    return true;
  } catch (error) {
    console.error('Invalid token:', error);
    return false;
  }
};