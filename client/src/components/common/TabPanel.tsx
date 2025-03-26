import React from 'react';
import { Box } from '@mui/material';

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * A reusable TabPanel component for displaying content in tabs
 */
export const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export default TabPanel;
