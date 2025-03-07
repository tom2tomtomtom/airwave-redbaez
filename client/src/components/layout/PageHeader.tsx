import React, { ReactNode } from 'react';
import { Box, Typography, Divider } from '@mui/material';

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  actionButton?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actionButton }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          {typeof title === 'string' ? (
            <Typography variant="h5" component="h1" gutterBottom>
              {title}
            </Typography>
          ) : (
            title
          )}
          {description && (
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {actionButton && (
          <Box>{actionButton}</Box>
        )}
      </Box>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
};

export default PageHeader;
