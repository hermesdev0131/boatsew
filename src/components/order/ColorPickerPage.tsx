'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Alert,
  IconButton,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { NewOrderFormData, VideoFile } from '@/types/order'
import { COLORS, Color } from '@/types/color'
import LocalMediaPreview from '@/components/LocalMediaPreview'

interface ColorPickerPageProps {
  formData: NewOrderFormData
  setFormData: React.Dispatch<React.SetStateAction<NewOrderFormData>>
  showPrompt: (title: string, message: string, severity?: 'error' | 'warning' | 'info' | 'success') => void
}

export default function ColorPickerPage({
  formData,
  setFormData,
  showPrompt,
}: ColorPickerPageProps) {
  const [mediaPreview, setMediaPreview] = useState<{
    open: boolean
    media: { url: string; type: 'image' | 'video'; name?: string } | null
  }>({ open: false, media: null })

  // Handle color selection
  const handleColorClick = (color: Color) => {
    if (formData.selectedColors.includes(color.name)) {
      // Remove color
      setFormData(prev => ({
        ...prev,
        selectedColors: prev.selectedColors.filter(c => c !== color.name),
        cushions: prev.cushions.map(cushion => ({
          ...cushion,
          colorPhotos: cushion.colorPhotos?.filter(photo => photo.name !== color.name) || []
        }))
      }))
    } else {
      // Add color
      setFormData(prev => ({
        ...prev,
        selectedColors: [...prev.selectedColors, color.name],
      }))
    }
  }

  // Handle file upload for a specific color
  const handleFileUpload = (colorName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showPrompt('Invalid File Type', 'Please select an image file (JPG, PNG, etc.).', 'error')
      return
    }

    const photoFile: VideoFile = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: colorName,
      size: file.size,
      type: file.type,
    }

    setFormData(prev => ({
      ...prev,
      cushions: prev.cushions.map(cushion => ({
        ...cushion,
        colorPhotos: [
          ...(cushion.colorPhotos?.filter(photo => photo.name !== colorName) || []),
          photoFile
        ]
      }))
    }))

    // Reset input
    event.target.value = ''
  }

  // Handle file removal
  const handleRemovePhoto = (colorName: string) => {
    setFormData(prev => ({
      ...prev,
      cushions: prev.cushions.map(cushion => ({
        ...cushion,
        colorPhotos: cushion.colorPhotos?.filter(photo => photo.name !== colorName) || []
      }))
    }))
  }

  // Get photo for a color
  const getPhotoForColor = (colorName: string) => {
    return formData.cushions[0]?.colorPhotos?.find(photo => photo.name === colorName)
  }

  return (
    <Box>
      {/* 
        IMPORTANT: This cushion preview image section should NEVER be removed.
        It provides users with a visual reference for their order.
        The image is located at public/images/cushion-preview.jpg
      */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <img
          src="/images/cushion-preview.jpg"
          alt="Cushion Preview"
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 8,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          }}
        />
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Select the colors for your order. You can choose from preset colors or add custom colors.
      </Typography>

      {/* Available Colors */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Available Colors
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {COLORS.map((color) => (
            <Box
              key={color.name}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
              onClick={() => handleColorClick(color)}
            >
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  backgroundColor: color.hex,
                  border: `3px solid ${formData.selectedColors.includes(color.name) ? '#1976d2' : '#ddd'}`,
                  borderRadius: 1,
                  position: 'relative',
                }}
              >
                {formData.selectedColors.includes(color.name) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 20,
                      height: 20,
                      bgcolor: '#1976d2',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </Box>
                )}
              </Box>
              <Typography variant="caption" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                {color.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Selected Colors */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Selected Colors ({formData.selectedColors.length})
        </Typography>
        {formData.selectedColors.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No colors selected yet. Choose colors from the presets above.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {formData.selectedColors.map((color) => (
              <Chip
                key={color}
                label={color}
                onDelete={() => handleColorClick({ name: color, hex: '#000' })}
                sx={{
                  backgroundColor: color.startsWith('#') ? color : 'transparent',
                  color: color.startsWith('#') ? 
                    (parseInt(color.slice(1), 16) > 0xffffff / 2 ? '#000' : '#fff') : 
                    'inherit',
                  border: color.startsWith('#') ? 'none' : `1px solid ${color}`,
                }}
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Color Photos Section */}
      {formData.selectedColors.length >= 2 && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Color Photos
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              You've selected {formData.selectedColors.length} colors!
              <br />
              For each color selected, upload an image of the cushion you'd like to replace. 
              Add an arrow pointing to the cushion you would like to replace.
            </Typography>
          </Alert>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {formData.selectedColors.map((colorName) => {
              const photo = getPhotoForColor(colorName)
              
              return (
                <Box key={colorName} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {colorName}
                  </Typography>
                  
                  {photo ? (
                    <Box sx={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(photo.file)}
                        alt={`${colorName} cushion`}
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                        onClick={() => setMediaPreview({
                          open: true,
                          media: {
                            url: URL.createObjectURL(photo.file),
                            type: 'image',
                            name: `${colorName} Cushion`,
                          },
                        })}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: 'error.main',
                          color: 'white',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          '&:hover': { bgcolor: 'error.dark' },
                        }}
                        onClick={() => handleRemovePhoto(colorName)}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ position: 'relative' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(colorName, e)}
                        style={{ display: 'none' }}
                        id={`file-input-${colorName}`}
                      />
                      <Button
                        variant="outlined"
                        onClick={() => {
                          const input = document.getElementById(`file-input-${colorName}`) as HTMLInputElement
                          if (input) {
                            input.click()
                          }
                        }}
                        sx={{
                          width: 100,
                          height: 100,
                          borderStyle: 'dashed',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <UploadIcon sx={{ fontSize: 20 }} />
                        <Typography variant="caption">
                          Upload
                        </Typography>
                      </Button>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Paper>
      )}

      <LocalMediaPreview
        open={mediaPreview.open}
        onClose={() => setMediaPreview({ open: false, media: null })}
        media={mediaPreview.media}
      />
    </Box>
  )
} 