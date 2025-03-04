import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
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
  CircularProgress
} from '@mui/material';
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { login } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [showPrototypeHelp, setShowPrototypeHelp] = useState(false);
  
  // Get the location the user was trying to access before redirecting to login
  const { from } = (location.state as LocationState) || { from: { pathname: '/dashboard' } };
  
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Required'),
      password: Yup.string().required('Required'),
    }),
    onSubmit: async (values) => {
      const resultAction = await dispatch(login(values));
      if (login.fulfilled.match(resultAction)) {
        // Navigate to the page the user was trying to access, or dashboard
        navigate(from?.pathname || '/dashboard');
      }
    },
  });
  
  const handleDemoLogin = () => {
    // For prototype, use a demo account
    formik.setValues({
      email: 'admin@redbaez.com',
      password: 'admin123'
    });
    setShowPrototypeHelp(true);
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
          
          {showPrototypeHelp && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                For this prototype, you can use: <br />
                Email: <strong>admin@redbaez.com</strong> <br />
                Password: <strong>admin123</strong>
              </Typography>
            </Alert>
          )}
          
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
            />
            <TextField
              margin="normal"
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
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
            
            <Button
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
              onClick={handleDemoLogin}
            >
              Use Demo Account
            </Button>
            
            <Grid container justifyContent="center">
              <Grid item>
                <Link component="button" variant="body2" onClick={() => setShowPrototypeHelp(true)}>
                  Need help signing in?
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        
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