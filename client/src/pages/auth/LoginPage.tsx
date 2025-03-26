import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../lib/supabase';
import {
  Avatar,
  Button,
  TextField,
  Paper,
  Box,
  Grid,
  Typography,
  Link,
  Alert,
  Container,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  InputAdornment,
  Snackbar
} from '@mui/material';
import {
  LockOutlined as LockOutlinedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import { login, setCredentials } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';
import TokenService from '../../services/TokenService';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

// MFA verification step interface
interface MFAStep {
  label: string;
  description: string;
}

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [isDevMode, setIsDevMode] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  
  // Additional state for enhanced security features
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  
  // MFA states
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  
  // Success notification
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Check if we're in development mode
  useEffect(() => {
    setIsDevMode(process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_DEV_LOGIN === 'true');
  }, []);
  
  // Get the location the user was trying to access before redirecting to login
  const { from } = (location.state as LocationState) || { from: { pathname: '/client-selection' } };
  
  // MFA verification steps
  const mfaSteps: MFAStep[] = [
    {
      label: 'Authentication',
      description: 'Enter your email and password',
    },
    {
      label: 'Verification',
      description: 'Enter the verification code',
    }
  ];
  
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required')
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        ),
    }),
    onSubmit: async (values) => {
      try {
        const result = await TokenService.login(values.email, values.password);
        
        if (result.error) {
          // Check if MFA is required - this would come from the server response
          if (result.error.includes('MFA required')) {
            setMfaRequired(true);
            setMfaFactorId(result.factorId || ''); // Factor ID would be returned from the server
            setActiveStep(1); // Move to MFA step
            return;
          }
          
          // Handle other errors
          formik.setErrors({ password: result.error });
          return;
        }
        
        if (result.accessToken) {
          // Set auth credentials in Redux store
          // Only set if user is not null
          if (result.user) {
            // Ensure user object conforms to User type in authSlice
            const user = {
              id: result.user.id || '',
              email: result.user.email || '',
              name: result.user?.user_metadata?.name || result.user?.email?.split('@')[0] || 'User',
              role: result.user?.user_metadata?.role || 'user'
            };
            
            dispatch(setCredentials({
              user,
              session: {
                access_token: result.accessToken,
                refresh_token: result.refreshToken || ''
              }
            }));
          }
          
          // Show success notification
          setNotificationMessage('Login successful');
          setShowSuccessNotification(true);
          
          // Navigate to the original destination or default route
          setTimeout(() => {
            navigate(from?.pathname || '/client-selection', { replace: true });
          }, 1000);
        }
      } catch (err: any) {
        console.error('Login error:', err);
        // Set form error
        formik.setErrors({ password: err.message || 'Authentication failed' });
      }
    },
  });
  
  // Handle password reset request
  const handleRequestPasswordReset = async () => {
    try {
      setResetError(null);
      
      if (!resetEmail) {
        setResetError('Please enter your email address');
        return;
      }
      
      const result = await TokenService.requestPasswordReset(resetEmail);
      
      if (result.error) {
        setResetError(result.error);
        return;
      }
      
      // Success - show success message
      setResetSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setResetError(err.message || 'Failed to request password reset');
    }
  };
  
  // Handle MFA verification
  const handleVerifyMFA = async () => {
    try {
      setMfaError(null);
      
      if (!mfaCode) {
        setMfaError('Please enter the verification code');
        return;
      }
      
      const result = await TokenService.verifyMFA(mfaCode, mfaFactorId);
      
      if (result.error) {
        setMfaError(result.error);
        return;
      }
      
      if (result.accessToken) {
        // Update auth state with the new token
        localStorage.setItem('airwave_auth_token', result.accessToken);
        
        // Show success notification
        setNotificationMessage('Verification successful');
        setShowSuccessNotification(true);
        
        // Navigate to the intended route
        setTimeout(() => {
          navigate(from?.pathname || '/client-selection', { replace: true });
        }, 1000);
      }
    } catch (err: any) {
      console.error('MFA verification error:', err);
      setMfaError(err.message || 'Verification failed');
    }
  };
  
  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Simple development login handler
  const handleDevLogin = async () => {
    if (!isDevMode) return;
    
    setDevLoading(true);
    setDevError(null);
    
    try {
      console.log('Attempting simple development login');
      
      // Direct Supabase login with dev credentials
      const devEmail = 'dev@example.com';
      const devPassword = 'devPassword123!';
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword
      });
      
      if (error) {
        // If login failed, try to create the account
        if (error.message.includes('Invalid login credentials')) {
          console.log('Dev account does not exist, creating it...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: devEmail,
            password: devPassword,
            options: {
              data: {
                name: 'Development User',
                role: 'admin'
              }
            }
          });
          
          if (signUpError) {
            setDevError(`Could not create dev account: ${signUpError.message}`);
            return;
          }
          
          // Try login again
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: devEmail,
            password: devPassword
          });
          
          if (retryError) {
            setDevError(`Created account but login failed: ${retryError.message}`);
            return;
          }
          
          // Use the retry data
          if (retryData?.session) {
            // Store token for persistence
            localStorage.setItem('airwave_auth_token', retryData.session.access_token);
            
            // Update Redux store with minimal user data
            dispatch(setCredentials({
              user: {
                id: retryData.user?.id || '',
                email: devEmail,
                name: 'Development User',
                role: 'admin'
              },
              session: retryData.session
            }));
            
            // Navigate to client selection
            setTimeout(() => {
              navigate('/client-selection', { replace: true });
            }, 1000);
          }
        } else {
          setDevError(error.message);
        }
      } else if (data?.session) {
        // Login successful
        localStorage.setItem('airwave_auth_token', data.session.access_token);
        
        // Update Redux store
        dispatch(setCredentials({
          user: {
            id: data.user?.id || '',
            email: data.user?.email || '',
            name: data.user?.user_metadata?.name || 'Development User',
            role: data.user?.user_metadata?.role || 'admin'
          },
          session: data.session
        }));
        
        // Show success notification
        setNotificationMessage('Development login successful');
        setShowSuccessNotification(true);
        
        // Navigate to client selection
        setTimeout(() => {
          navigate('/client-selection', { replace: true });
        }, 1000);
      } else {
        setDevError('Login succeeded but no session was returned');
      }
    } catch (err: any) {
      console.error('Development login error:', err);
      setDevError(err.message || 'Development login failed');
    } finally {
      setDevLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
            mt: 4,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              AIrWAVE by Redbaez
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {devError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {devError}
            </Alert>
          )}
          
          {isDevMode && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Development mode is active. You can use the development login button below.
            </Alert>
          )}
          
          {activeStep === 0 ? (
            <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="normal"
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKeyIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
              
              {isDevMode && (
                <>
                  <Divider sx={{ my: 2 }}>OR</Divider>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={handleDevLogin}
                    disabled={devLoading}
                    sx={{ mb: 2 }}
                  >
                    {devLoading ? <CircularProgress size={24} /> : 'Development Login'}
                  </Button>
                </>
              )}
              
              <Grid container justifyContent="center" spacing={2}>
                <Grid item>
                  <Link 
                    component="button" 
                    variant="body2" 
                    onClick={(e) => {
                      e.preventDefault();
                      setResetPasswordOpen(true);
                    }}
                  >
                    Forgot password?
                  </Link>
                </Grid>
                <Grid item>
                  <Link component={RouterLink} to="/auth/register" variant="body2">
                    Don't have an account? Sign up
                  </Link>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {mfaSteps.map((step) => (
                  <Step key={step.label}>
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              
              <Typography variant="h6" gutterBottom>
                Two-Factor Authentication
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                Please enter the verification code sent to your device.
              </Typography>
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="mfa-code"
                label="Verification Code"
                name="mfaCode"
                autoFocus
                inputProps={{ maxLength: 6 }}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                error={!!mfaError}
                helperText={mfaError}
              />
              
              {mfaError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {mfaError}
                </Alert>
              )}
              
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleVerifyMFA}
                disabled={!mfaCode}
                sx={{ mt: 3, mb: 2 }}
              >
                Verify
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setActiveStep(0)}
                sx={{ mt: 1, mb: 2 }}
              >
                Back to Login
              </Button>
            </Box>
          )}
        </Paper>
        
        {/* Password Reset Dialog */}
        <Dialog open={resetPasswordOpen} onClose={() => setResetPasswordOpen(false)}>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogContent>
            {!resetSent ? (
              <>
                <DialogContentText>
                  Enter your email address and we'll send you a link to reset your password.
                </DialogContentText>
                <TextField
                  autoFocus
                  margin="dense"
                  id="reset-email"
                  label="Email Address"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  error={!!resetError}
                  helperText={resetError}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            ) : (
              <DialogContentText>
                If an account exists with this email, you will receive a password reset link shortly.
                Please check your email and follow the instructions to reset your password.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetPasswordOpen(false)} color="primary">
              {resetSent ? 'Close' : 'Cancel'}
            </Button>
            {!resetSent && (
              <Button onClick={handleRequestPasswordReset} color="primary" variant="contained">
                Send Reset Link
              </Button>
            )}
          </DialogActions>
        </Dialog>
        
        {/* Success Notification */}
        <Snackbar
          open={showSuccessNotification}
          autoHideDuration={5000}
          onClose={() => setShowSuccessNotification(false)}
          message={notificationMessage}
        />
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 5 }}>
          {'© '}
          <Link color="inherit" href="https://redbaez.com/">
            Redbaez
          </Link>{' '}
          {new Date().getFullYear()}
        </Typography>
      </Box>
    </Container>
  );
};

export default LoginPage;
