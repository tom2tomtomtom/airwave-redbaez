import React, { useState } from 'react';
import { Box, Popover, IconButton } from '@mui/material';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const open = Boolean(anchorEl);
  const id = open ? 'colour-popover' : undefined;
  
  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{ 
          backgroundColor: color, 
          width: 24, 
          height: 24, 
          border: '1px solid #0000001A',
          '&:hover': {
            backgroundColor: color,
            opacity: 0.8
          }
        }}
      />
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{ mt: 1 }}
      >
        <Box p={1}>
          <HexColorPicker color={color} onChange={onChange} />
        </Box>
      </Popover>
    </>
  );
};

export default ColorPicker;
