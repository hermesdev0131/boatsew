'use client'

import React, { useState } from 'react'
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
import { supabase } from '@/lib/supabase'

interface MediaPreviewProps {
  mediaFileName: string
  mediaType: string
  orderId: number
}

export default function MediaPreview({ mediaFileName, mediaType, orderId }: MediaPreviewProps) {
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)



  // Load media URL using Supabase signed URL (more efficient than blob download)
  React.useEffect(() => {
    let isMounted = true

    const loadMediaUrl = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Create a signed URL that expires in 1 hour
        const { data, error } = await supabase.storage
          .from('media')
          .createSignedUrl(`${orderId}/${mediaFileName}`, 3600) // 1 hour expiry

        if (error) {
          throw new Error(`Failed to load media: ${error.message}`)
        }

        // Only set URL if component is still mounted
        if (isMounted && data?.signedUrl) {
          setMediaUrl(data.signedUrl)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load media')
          console.error('Media load error:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (mediaFileName && orderId) {
      loadMediaUrl()
    }

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [mediaFileName, orderId])

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('media')
        .download(`${orderId}/${mediaFileName}`)

      if (error) {
        throw new Error(`Download failed: ${error.message}`)
      }

      // data is already a Blob from Supabase, use it directly
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = mediaFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up blob URL
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const getMediaIcon = () => {
    switch (mediaType) {
      case 'image':
        return <Image />
      case 'video':
        return <VideoFile />
      default:
        return <Description />
    }
  }

  const getMediaLabel = () => {
    switch (mediaType) {
      case 'image':
        return 'Image'
      case 'video':
        return 'Video'
      default:
        return 'File'
    }
  }

  const renderMediaContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Loading media...
          </Typography>
        </Box>
      )
    }

    if (error) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Typography variant="body2" color="error">
            Failed to load media
          </Typography>
        </Box>
      )
    }

    if (!mediaUrl) {
      return null
    }
    
    switch (mediaType) {
      case 'image':
        return (
          <img
            src={mediaUrl}
            alt="Media"
            style={{
              width: '200px',
              height: '200px',
              objectFit: 'cover',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={() => setShowFullscreen(true)}
          />
        )
      case 'video':
        return (
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <video
              src={mediaUrl}
              style={{
                width: '200px',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
              muted
              preload="metadata"
            />
            <IconButton
              onClick={() => setShowFullscreen(true)}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.7)'
                }
              }}
            >
              <PlayArrow />
            </IconButton>
          </Box>
        )
      default:
        return (
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
            onClick={handleDownload}
          >
            {getMediaIcon()}
            <Typography variant="body2">
              {mediaFileName}
            </Typography>
            <Download fontSize="small" />
          </Paper>
        )
    }
  }

  const renderFullscreenContent = () => {
    if (!mediaUrl) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Media not available
          </Typography>
        </Box>
      )
    }
    
    switch (mediaType) {
      case 'image':
        return (
          <img
            src={mediaUrl}
            alt="Media"
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain'
            }}
          />
        )
      case 'video':
        return (
          <video
            src={mediaUrl}
            controls
            style={{
              maxWidth: '100%',
              maxHeight: '80vh'
            }}
          />
        )
      default:
        return (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Description sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {mediaFileName}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
            >
              Download File
            </Button>
          </Box>
        )
    }
  }

  return (
    <>
      <Box sx={{ mt: 1 }}>
        {renderMediaContent()}
      </Box>

      <Dialog
        open={showFullscreen}
        onClose={() => {
          setShowFullscreen(false)
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>
              {getMediaLabel()}: {mediaFileName}
            </Typography>
            <IconButton onClick={() => setShowFullscreen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {renderFullscreenContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownload} startIcon={<Download />}>
            Download
          </Button>
          <Button onClick={() => setShowFullscreen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
} 