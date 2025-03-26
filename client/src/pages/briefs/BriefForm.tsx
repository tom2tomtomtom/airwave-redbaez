import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../../store';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  PlayArrow as AnalyseIcon,
} from '@mui/icons-material';
import { AppDispatch } from '../../store';
import {
  Brief,
  createBrief,
  updateBrief,
  deleteBrief,
  analyzeBrief,
  fetchBriefById,
  selectCurrentBrief,
  selectBriefsLoading,
  selectBriefsError,
} from '../../store/slices/briefsSlice';

interface FormData {
  title: string;
  content: string;
  tags: string[];
  organisation_id?: string;
  campaignObjectives: string;
  targetAudience: string;
  keyMessages: string;
  visualPreferences?: string;
}

const BriefForm: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const currentBrief = useSelector(selectCurrentBrief);
  const loading = useSelector(selectBriefsLoading);
  const error = useSelector(selectBriefsError);

  // Get organisation context from auth hook
  const { user, organisation } = useAuth();

  // RootState type is now imported at the top of the file

  const validationSchema = yup.object({
    title: yup
      .string()
      .required('Please enter a brief title')
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must be at most 100 characters'),
    content: yup
      .string()
      .required('Please provide brief content')
      .min(50, 'Brief content must be at least 50 characters')
      .max(5000, 'Brief content must be at most 5000 characters'),
    campaignObjectives: yup
      .string()
      .required('Please specify campaign objectives')
      .min(20, 'Campaign objectives must be at least 20 characters'),
    targetAudience: yup
      .string()
      .required('Please specify target audience')
      .min(20, 'Target audience description must be at least 20 characters'),
    keyMessages: yup
      .string()
      .required('Please specify key messages')
      .min(20, 'Key messages must be at least 20 characters'),
    visualPreferences: yup
      .string()
      .optional(),
    tags: yup
      .array()
      .of(yup.string())
      .min(1, 'Please add at least one tag')
      .max(10, 'Maximum 10 tags allowed')
  });

  const formik = useFormik<FormData>({
    initialValues: {
      title: '',
      content: '',
      campaignObjectives: '',
      targetAudience: '',
      keyMessages: '',
      visualPreferences: '',
      tags: [],
      organisation_id: user?.organisation_id || organisation?.id || '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const briefData = {
        ...values,
        status: 'draft',
        organisation_id: user?.organisation_id || organisation?.id,
      };

      try {
        if (isEditing && id) {
          await dispatch(updateBrief({ id, updates: briefData })).unwrap();
        } else {
          const result = await dispatch(createBrief(briefData)).unwrap();
          if (analysisStarted && result.id) {
            await dispatch(analyzeBrief(result.id)).unwrap();
          }
        }
        navigate('/briefs');
      } catch (error) {
        console.error('Failed to save brief:', error);
      }
    },
  });

  const [tagInput, setTagInput] = useState('');
  const [analysisStarted, setAnalysisStarted] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchBriefById(id));
    }
  }, [dispatch, id, isEditing]);

  useEffect(() => {
    if (currentBrief && isEditing) {
      formik.setValues({
        title: currentBrief.title || '',
        content: currentBrief.content || '',
        campaignObjectives: currentBrief.campaignObjectives || '',
        targetAudience: currentBrief.targetAudience || '',
        keyMessages: currentBrief.keyMessages || '',
        visualPreferences: currentBrief.visualPreferences || '',
        tags: currentBrief.tags || [],
        organisation_id: currentBrief.organisationId || user?.organisation_id || '',
      });
    }
  }, [currentBrief, isEditing, formik, user?.organisation_id]);



  const handleDelete = async () => {
    if (isEditing && id && window.confirm('Are you sure you want to delete this brief?')) {
      try {
        await dispatch(deleteBrief(id)).unwrap();
        navigate('/briefs');
      } catch (error) {
        console.error('Failed to delete brief:', error);
      }
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!formik.values.tags.includes(newTag) && formik.values.tags.length < 10) {
        formik.setFieldValue('tags', [...formik.values.tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleTagDelete = (tagToDelete: string) => {
    formik.setFieldValue(
      'tags',
      formik.values.tags.filter((tag) => tag !== tagToDelete)
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {isEditing ? 'Edit Brief' : 'Create Brief'}
        </Typography>
        {isEditing && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete Brief
          </Button>
        )}
      </Box>

      {error && (
        <Box sx={{ mb: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Brief Title"
                      name="title"
                      value={formik.values.title}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.title && Boolean(formik.errors.title)}
                      helperText={formik.touched.title && formik.errors.title}
                      required
                      disabled={loading}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Campaign Overview"
                      name="content"
                      value={formik.values.content}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.content && Boolean(formik.errors.content)}
                      helperText={
                        (formik.touched.content && formik.errors.content) ||
                        'Provide a general overview of your campaign.'
                      }
                      required
                      multiline
                      rows={4}
                      disabled={loading}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Campaign Objectives"
                      name="campaignObjectives"
                      value={formik.values.campaignObjectives}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.campaignObjectives && Boolean(formik.errors.campaignObjectives)}
                      helperText={
                        (formik.touched.campaignObjectives && formik.errors.campaignObjectives) ||
                        'What are the key objectives and goals of this campaign?'
                      }
                      required
                      multiline
                      rows={3}
                      disabled={loading}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Target Audience"
                      name="targetAudience"
                      value={formik.values.targetAudience}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.targetAudience && Boolean(formik.errors.targetAudience)}
                      helperText={
                        (formik.touched.targetAudience && formik.errors.targetAudience) ||
                        'Describe your target audience, including demographics, interests, and behaviours.'
                      }
                      required
                      multiline
                      rows={3}
                      disabled={loading}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Key Messages"
                      name="keyMessages"
                      value={formik.values.keyMessages}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.keyMessages && Boolean(formik.errors.keyMessages)}
                      helperText={
                        (formik.touched.keyMessages && formik.errors.keyMessages) ||
                        'What are the main messages you want to communicate?'
                      }
                      required
                      multiline
                      rows={3}
                      disabled={loading}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Visual Preferences"
                      name="visualPreferences"
                      value={formik.values.visualPreferences}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.visualPreferences && Boolean(formik.errors.visualPreferences)}
                      helperText={
                        (formik.touched.visualPreferences && formik.errors.visualPreferences) ||
                        'Optional: Any specific visual style, colour schemes, or branding guidelines to consider?'
                      }
                      multiline
                      rows={2}
                      disabled={loading}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Add Tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagAdd}
                      disabled={loading}
                      error={formik.touched.tags && Boolean(formik.errors.tags)}
                      helperText={
                        (formik.touched.tags && formik.errors.tags) ||
                        'Press Enter to add a tag'
                      }
                    />
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formik.values.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          onDelete={() => handleTagDelete(tag)}
                          sx={{ backgroundColor: theme.palette.grey[200] }}
                        />
                      ))}                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/briefs')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={loading}
                onClick={() => setAnalysisStarted(false)}
              >
                Save Brief
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                startIcon={<AnalyseIcon />}
                disabled={loading}
                onClick={() => setAnalysisStarted(true)}
              >
                Save & Analyse
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography>Processing...</Typography>
        </Box>
      )}
    </Container>
  );
};

export default BriefForm;
