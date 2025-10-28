import React, { useState, useRef } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert
} from '@mui/material'
import {
  AttachFile,
  Image,
  VideoFile,
  Description,
  Close
} from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

// Generate UUID for unique filenames
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface MediaUploadProps {
  orderId: number
  onMediaUploaded: (fileName: string, mediaType: string) => void
  disabled?: boolean
}

interface MediaFile {
  file: File
  type: 'image' | 'video' | 'file'
  preview?: string
}

export default function MediaUpload({ orderId, onMediaUploaded, disabled }: MediaUploadProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleFileSelect = (type: 'image' | 'video' | 'file') => {
    handleMenuClose()
    
    let inputRef: HTMLInputElement | null = null
    let accept = ''
    
    switch (type) {
      case 'image':
        inputRef = imageInputRef.current
        accept = 'image/*'
        break
      case 'video':
        inputRef = videoInputRef.current
        accept = 'video/*'
        break
      case 'file':
        inputRef = fileInputRef.current
        accept = '*/*'
        break
    }
    
    if (inputRef) {
      inputRef.accept = accept
      inputRef.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (1GB limit)
    if (file.size > 1024 * 1024 * 1024) {
      setError('File size must be less than 1GB')
      return
    }

    let mediaFile: MediaFile = { file, type }
    
    // Create preview for images and videos
    if (type === 'image' || type === 'video') {
      mediaFile.preview = URL.createObjectURL(file)
      setSelectedFile(mediaFile)
      setShowPreview(true)
    } else {
      // For files, upload directly
      await uploadFile(mediaFile)
    }
  }

  const uploadFile = async (mediaFile: MediaFile) => {
    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      // Generate UUID for filename
      const fileExtension = mediaFile.file.name.split('.').pop()
      const uuid = generateUUID()
      const fileName = `${uuid}.${fileExtension}`
      const filePath = `${orderId}/${fileName}`

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, mediaFile.file)

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      const mediaType = mediaFile.type

      onMediaUploaded(fileName, mediaType)
      
      // Clean up
      if (mediaFile.preview) {
        URL.revokeObjectURL(mediaFile.preview)
      }
      setSelectedFile(null)
      setShowPreview(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleConfirmUpload = async () => {
    if (selectedFile) {
      await uploadFile(selectedFile)
    }
  }

  const handleCancelUpload = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview)
    }
    setSelectedFile(null)
    setShowPreview(false)
  }

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        disabled={disabled || uploading}
        color="primary"
        sx={{ alignSelf: 'flex-end' }}
      >
        <AttachFile />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleFileSelect('image')}>
          <ListItemIcon>
            <Image fontSize="small" />
          </ListItemIcon>
          <ListItemText>Image</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFileSelect('video')}>
          <ListItemIcon>
            <VideoFile fontSize="small" />
          </ListItemIcon>
          <ListItemText>Video</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFileSelect('file')}>
          <ListItemIcon>
            <Description fontSize="small" />
          </ListItemIcon>
          <ListItemText>File</ListItemText>
        </MenuItem>
      </Menu>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'video')}
      />
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'file')}
      />

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ width: '100%', mt: 1 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" sx={{ mt: 0.5 }}>
            Uploading... {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={handleCancelUpload}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>Preview Media</Typography>
            <IconButton onClick={handleCancelUpload}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFile?.type === 'image' && selectedFile.preview && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={selectedFile.preview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
          {selectedFile?.type === 'video' && selectedFile.preview && (
            <Box sx={{ textAlign: 'center' }}>
              <video
                src={selectedFile.preview}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px'
                }}
              />
            </Box>
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            File: {selectedFile?.file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Size: {selectedFile?.file.size ? (selectedFile.file.size / 1024 / 1024).toFixed(2) : 'Unknown'} MB
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelUpload}>Cancel</Button>
          <Button 
            onClick={handleConfirmUpload}
            variant="contained"
            disabled={uploading}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
} 