import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import apiClient from '../api/apiClient';

interface AssetImageProps {
  src: string;
  alt?: string;
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Component for displaying asset images with proper URL resolution
 * This ensures that relative URLs are properly resolved against the API base URL
 */
const AssetImage: React.FC<AssetImageProps> = ({ 
  src, 
  alt = '', 
  height = 'auto', 
  width = '100%',
  style = {},
  className = ''
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // If src is already a full URL, use it directly
    if (src.startsWith('http://') || src.startsWith('https://')) {
      setImageSrc(src);
      setLoading(false);
      return;
    }

    // If src is a relative URL starting with /uploads, resolve it against the API base URL
    if (src.startsWith('/uploads/')) {
      const baseUrl = apiClient.defaults.baseURL || '';
      const resolvedUrl = `${baseUrl}${src}`;
      console.log('Resolved asset URL:', resolvedUrl);
      setImageSrc(resolvedUrl);
      setLoading(false);
      return;
    }

    // Otherwise, use the src as is
    setImageSrc(src);
    setLoading(false);
  }, [src]);

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
    console.error(`Failed to load image: ${src}`);
  };

  return (
    <Box position="relative" height={height} width={width} className={className} style={style}>
      {loading && (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          position="absolute" 
          width="100%" 
          height="100%"
        >
          <CircularProgress size={24} />
        </Box>
      )}
      
      {error ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          width="100%" 
          height="100%" 
          bgcolor="#f5f5f5" 
          color="#999"
          fontSize="12px"
          textAlign="center"
        >
          Image not available
        </Box>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          style={{ 
            display: loading ? 'none' : 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </Box>
  );
};

export default AssetImage;
