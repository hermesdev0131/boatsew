'use client'

import React from 'react'
import {
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper
} from '@mui/material'
import {
  Image,
  VideoFile,
  Description,
  Download,
  Close,
  PlayArrow
} from '@mui/icons-material'

interface LocalMediaPreviewProps {
  open: boolean
  onClose: () => void
  media: {
    url: string
    type: 'video' | 'image'
    name?: string
  } | null
}

export default function LocalMediaPreview({ open, onClose, media }: LocalMediaPreviewProps) {
  if (!media) return null

  const getMediaIcon = () => {
    switch (media.type) {
      case 'image':
        return <Image sx={{ fontSize: 40 }} />
      case 'video':
        return <VideoFile sx={{ fontSize: 40 }} />
      default:
        return <Description sx={{ fontSize: 40 }} />
    }
  }

  const getMediaLabel = () => {
    switch (media.type) {
      case 'image':
        return 'Image'
      case 'video':
        return 'Video'
      default:
        return 'File'
    }
  }

  const renderMediaContent = () => {
    if (!media.url) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No media to preview
          </Typography>
        </Box>
      )
    }

    switch (media.type) {
      case 'image':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
            <img
              src={media.url}
              alt={media.name || 'Preview'}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </Box>
        )
      case 'video':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
            <video
              src={media.url}
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                borderRadius: '8px'
              }}
            />
          </Box>
        )
      default:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 4 }}>
            <Description sx={{ fontSize: 60, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.secondary">
              File Preview Not Available
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              This file type cannot be previewed. You can download it instead.
            </Typography>
          </Box>
        )
    }
  }

  const renderFullscreenContent = () => {
    if (!media.url) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No media to preview
          </Typography>
        </Box>
      )
    }

    switch (media.type) {
      case 'image':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <img
              src={media.url}
              alt={media.name || 'Preview'}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          </Box>
        )
      case 'video':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <video
              src={media.url}
              controls
              style={{
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          </Box>
        )
      default:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 4 }}>
            <Description sx={{ fontSize: 60, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.secondary">
              File Preview Not Available
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              This file type cannot be previewed. You can download it instead.
            </Typography>
          </Box>
        )
    }
  }

  const handleDownload = () => {
    if (media.url) {
      const link = document.createElement('a')
      link.href = media.url
      link.download = media.name || `download.${media.type === 'image' ? 'jpg' : 'mp4'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <>
      {/* Preview in dialog */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getMediaIcon()}
            <Typography variant="h6">
              {media.name || `${getMediaLabel()} Preview`}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {renderMediaContent()}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownload}
            disabled={!media.url}
          >
            Download
          </Button>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
} 