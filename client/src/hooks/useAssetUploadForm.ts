import { useState, useRef, useCallback } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AssetFormData } from '../types/assets';

/**
 * Validation schema for asset upload form
 */
const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  type: Yup.string().required('Asset type is required').oneOf(['image', 'video', 'audio', 'text']),
  tags: Yup.array().of(Yup.string()),
  description: Yup.string(),
  clientId: Yup.string().required('Client ID is required'),
  // File validation happens separately because formik doesn't handle file uploads well
});

/**
 * Available asset types
 */
export const assetTypes = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Voice Over' },
  { value: 'text', label: 'Copy Text' },
];

/**
 * Hook props
 */
interface UseAssetUploadFormProps {
  onSubmit: (formData: FormData) => void;
  clientId: string; // Client ID to associate with the asset
}

/**
 * Custom hook for asset upload form management
 */
export const useAssetUploadForm = ({ onSubmit, clientId }: UseAssetUploadFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  
  /**
   * Formik hook for form state and validation
   */
  const formik = useFormik<AssetFormData>({
    initialValues: {
      name: '',
      type: 'image',
      tags: [],
      description: '',
      content: '',
      clientSlug: '', // Required field for new asset model
      clientId: clientId // Set from the prop (legacy support)
    },
    validationSchema,
    onSubmit: (values) => {
      // For text assets, we don't need a file
      if (values.type === 'text') {
        if (!values.content) {
          setFileError('Content is required for text assets');
          return;
        }
      } else if (!selectedFile) {
        setFileError('File is required');
        return;
      }

      const formData = new FormData();
      
      // Add all form values to the FormData
      Object.keys(values).forEach(key => {
        if (key === 'tags' && values.tags) {
          formData.append(key, JSON.stringify(values.tags));
        } else if (values[key as keyof AssetFormData] !== undefined) {
          formData.append(key, String(values[key as keyof AssetFormData]));
        }
      });
      
      // Add the file if it's not a text asset
      if (values.type !== 'text' && selectedFile) {
        formData.append('file', selectedFile);
      }
      
      onSubmit(formData);
    },
  });

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure the event and files exist
    if (!event.target || !event.target.files || event.target.files.length === 0) {
      console.warn('No file selected or event.target.files is null/empty');
      return;
    }
    
    // Get the selected file
    const file = event.target.files[0];
    if (!file) {
      console.warn('File is null or undefined');
      return;
    }
    
    // Immediately set the selected file to provide user feedback
    console.log('File selected immediately:', file.name);
    setSelectedFile(file);
    setFileError(null);
    
    // Force immediate read to ensure file is accessible
    const reader = new FileReader();
    reader.onload = () => {
      // This ensures the file is read into memory so it's fully accessible
      console.log('File loaded successfully into memory');
      
      // Log file information for debugging
      console.log('File selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      // Validate file type
      const assetType = formik.values.type;
      let isValid = false;
      
      // More permissive file type checking with additional formats
      if (assetType === 'image' && (
          file.type.startsWith('image/') || 
          file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|tif|psd|ai|heif|heic)$/i)
        )) {
        isValid = true;
      } else if (assetType === 'video' && (
          file.type.startsWith('video/') ||
          file.name.match(/\.(mp4|mov|avi|webm|mkv|wmv|flv|m4v|3gp|quicktime)$/i)
        )) {
        isValid = true;
      } else if (assetType === 'audio' && (
          file.type.startsWith('audio/') ||
          file.name.match(/\.(mp3|wav|ogg|aac|flac|m4a|wma|opus|alac)$/i)
        )) {
        isValid = true;
      } else if (assetType === 'text') {
        // Always valid for text type since we don't actually need a file
        isValid = true;
      }
      
      if (!isValid) {
        const errorMsg = `File must be a valid ${assetType} file. Selected: ${file.type || 'unknown type'}`;
        console.error(errorMsg, file);
        setFileError(errorMsg);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setSelectedFile(file);
      setFileError(null);
      
      // Auto-fill name if empty - remove file extension and clean up name
      if (!formik.values.name) {
        // Get filename without extension and replace dashes/underscores with spaces
        const cleanName = file.name.split('.')[0]
          .replace(/[-_]/g, ' ')
          .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
          .trim();
          
        // Capitalize first letter of each word
        const formattedName = cleanName.replace(/\b\w/g, l => l.toUpperCase());
        
        formik.setFieldValue('name', formattedName);
      }
    };
    
    // Handle file read errors
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      setFileError('Error reading file. Please try again.');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    // Start reading a small portion of the file to ensure it's available
    // Using readAsArrayBuffer to just verify file is accessible, not for content
    reader.readAsArrayBuffer(file.slice(0, 1024)); // Just read first 1KB
  }, [formik]);

  /**
   * Add a new tag
   */
  const handleAddTag = useCallback(() => {
    if (newTag && formik.values.tags && !formik.values.tags.includes(newTag)) {
      formik.setFieldValue('tags', [...(formik.values.tags || []), newTag]);
      setNewTag('');
    }
  }, [newTag, formik]);

  /**
   * Remove a tag
   */
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    formik.setFieldValue(
      'tags', 
      (formik.values.tags || []).filter(tag => tag !== tagToRemove)
    );
  }, [formik]);

  /**
   * Handle enter key in tag input
   */
  const handleTagKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  /**
   * Reset the form
   */
  const resetForm = useCallback(() => {
    formik.resetForm();
    setSelectedFile(null);
    setFileError(null);
    setNewTag('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [formik]);

  return {
    formik,
    fileInputRef,
    selectedFile,
    setSelectedFile,
    fileError,
    setFileError,
    newTag,
    setNewTag,
    handleFileChange,
    handleAddTag,
    handleRemoveTag,
    handleTagKeyDown,
    resetForm
  };
};
