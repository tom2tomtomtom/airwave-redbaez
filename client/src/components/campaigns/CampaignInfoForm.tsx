import React from 'react';
import {
  Box,
  TextField,
  Grid,
  Chip,
  FormControl,
  FormLabel,
  FormHelperText,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  Typography,
  Autocomplete,
  OutlinedInput
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { textContent } from '../../utils/textContent';

interface CampaignInfoFormProps {
  campaignInfo: {
    name: string;
    description: string;
    client: string;
    startDate: Date | null;
    endDate: Date | null;
    platforms: string[];
    status?: string;
  };
  onChange: (values: Partial<CampaignInfoFormProps['campaignInfo']>) => void;
  onPlatformsChange?: (platforms: string[]) => void;
  onStatusChange?: (status: string) => void;
  errors?: Record<string, string>;
}

const platformOptions = [
  { label: 'Facebook', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'TikTok', value: 'tiktok' },
];

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Ready for Review', value: 'review' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paused', value: 'paused' },
];

const clientOptions = [
  'Acme Corporation',
  'Globex',
  'Soylent Corp',
  'Initech',
  'Umbrella Corporation',
  'Stark Industries',
  'Wayne Enterprises',
];

const CampaignInfoForm: React.FC<CampaignInfoFormProps> = ({
  campaignInfo,
  onChange,
  onPlatformsChange,
  onStatusChange,
  errors = {}
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  const handleDateChange = (name: string) => (date: Date | null) => {
    onChange({ [name]: date });
  };

  const handlePlatformsChange = (event: SelectChangeEvent<string[]>) => {
    const platforms = event.target.value as string[];
    if (onPlatformsChange) {
      onPlatformsChange(platforms);
    } else {
      onChange({ platforms });  
    }
  };

  const handleClientChange = (event: React.SyntheticEvent, value: string | null) => {
    onChange({ client: value || '' });
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    const status = event.target.value;
    if (onStatusChange) {
      onStatusChange(status);
    } else {
      onChange({ status });
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={textContent.labels.campaigns.name}
            name="name"
            value={campaignInfo.name}
            onChange={handleInputChange}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Autocomplete
            freeSolo
            options={clientOptions}
            value={campaignInfo.client}
            onChange={handleClientChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Client"
                name="client"
                error={!!errors.client}
                helperText={errors.client}
                required
                onChange={(e) => {
                  handleInputChange(e);
                  params.inputProps.onChange?.(e as any);
                }}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Campaign Description"
            name="description"
            value={campaignInfo.description}
            onChange={handleInputChange}
            multiline
            rows={4}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DatePicker
            label="Start Date"
            value={campaignInfo.startDate}
            onChange={handleDateChange('startDate')}
            slotProps={{
              textField: {
                fullWidth: true,
                name: 'startDate',
              }
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DatePicker
            label="End Date"
            value={campaignInfo.endDate}
            onChange={handleDateChange('endDate')}
            slotProps={{
              textField: {
                fullWidth: true,
                name: 'endDate',
              }
            }}
            minDate={campaignInfo.startDate || undefined}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.platforms} required>
            <InputLabel id="platforms-label">Target Platforms</InputLabel>
            <Select
              labelId="platforms-label"
              multiple
              value={campaignInfo.platforms}
              onChange={handlePlatformsChange}
              input={<OutlinedInput label="Target Platforms" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const platform = platformOptions.find(p => p.value === value);
                    return platform ? (
                      <Chip key={value} label={platform.label} />
                    ) : null;
                  })}
                </Box>
              )}
            >
              {platformOptions.map((platform) => (
                <MenuItem key={platform.value} value={platform.value}>
                  {platform.label}
                </MenuItem>
              ))}
            </Select>
            {errors.platforms && (
              <FormHelperText>{errors.platforms}</FormHelperText>
            )}
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Select the platforms where your ads will run. This will help filter appropriate templates in the next step.
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="status-label">Campaign Status</InputLabel>
            <Select
              labelId="status-label"
              name="status"
              value={campaignInfo.status || 'draft'}
              onChange={handleStatusChange}
              label="Campaign Status"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
};

export default CampaignInfoForm;