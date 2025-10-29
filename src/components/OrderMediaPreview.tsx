'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton
} from '@mui/material'
import { Close, PlayArrow } from '@mui/icons-material'
import { supabase } from '@/lib/supabase'

interface OrderMediaPreviewProps {
  fileName: string
  alt: string
  width?: string
  height?: string
  maxWidth?: string
  maxHeight?: string
}

export default function OrderMediaPreview({ 
  fileName, 
  alt, 
  width = '100%',
  height = '150px',
  maxWidth = '200px',
  maxHeight = '200px'
}: OrderMediaPreviewProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullscreen, setShowFullscreen] = useState(false)

  useEffect(() => {
    let isMounted = true
    let currentBlobUrl: string | null = null

    const loadMediaUrl = async () => {
      // Skip if fileName is empty or null
      if (!fileName || fileName.trim() === '') {
        setLoading(false)
        setError('No file specified')
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Determine the correct bucket and path based on the filename
        let bucket = 'media'
        let path = fileName
        
        // If it's a full path (contains slashes), use it as-is
        if (fileName.includes('/')) {
          // Check if it starts with a user ID pattern (likely scans bucket)
          if (fileName.match(/^[a-f0-9-]+\//)) {
            bucket = 'scans'
          }
        } else {
          // For simple filenames, try common paths
          if (fileName.toLowerCase().includes('.mp4') || fileName.toLowerCase().includes('.mov') || fileName.toLowerCase().includes('.webm')) {
            path = `orders/videos/${fileName}`
          } else {
            path = `orders/photos/${fileName}`
          }
        }

        console.log(`Attempting to load: ${bucket}/${path}`)
        
        const result = await supabase.storage.from(bucket).download(path)
        
        if (result.error) {
          // If first attempt fails, try the other bucket
          const otherBucket = bucket === 'media' ? 'scans' : 'media'
          console.log(`Retrying with bucket: ${otherBucket}/${path}`)
          const retryResult = await supabase.storage.from(otherBucket).download(path)
          
          if (retryResult.error) {
            throw new Error(`Media not found in either bucket: ${fileName}`)
          }
          
          if (isMounted) {
            // retryResult.data is already a Blob from Supabase, use it directly
            const url = URL.createObjectURL(retryResult.data)
            currentBlobUrl = url
            setMediaUrl(url)
          }
        } else {
          if (isMounted) {
            // result.data is already a Blob from Supabase, use it directly
            const url = URL.createObjectURL(result.data)
            currentBlobUrl = url
            setMediaUrl(url)
          }
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

    loadMediaUrl()

    return () => {
      isMounted = false
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl)
      }
    }
  }, [fileName])

  useEffect(() => {
    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl)
      }
    }
  }, [])

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        width,
        height,
        border: '1px dashed #ccc',
        borderRadius: '8px'
      }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        width,
        height,
        border: '1px dashed #ccc',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5'
      }}>
        <Typography variant="caption" color="text.secondary">
          Failed to load
        </Typography>
      </Box>
    )
  }

  if (!mediaUrl) {
    return null
  }

  const isVideo = fileName.toLowerCase().includes('.mp4') || 
                  fileName.toLowerCase().includes('.mov') || 
                  fileName.toLowerCase().includes('.avi') ||
                  fileName.toLowerCase().includes('.webm')

  return (
    <>
      <Box 
        onClick={() => setShowFullscreen(true)}
        sx={{ cursor: 'pointer' }}
      >
                 {isVideo ? (
           <Box sx={{ position: 'relative', display: 'inline-block' }}>
             <video
               src={mediaUrl}
               style={{
                 width,
                 height,
                 maxWidth,
                 maxHeight,
                 objectFit: 'cover',
                 borderRadius: '8px'
               }}
               muted
               preload="metadata"
             />
             <IconButton
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
         ) : (
          <img
            src={mediaUrl}
            alt={alt}
            style={{
              width,
              height,
              maxWidth,
              maxHeight,
              objectFit: 'cover',
              borderRadius: '8px'
            }}
          />
        )}
      </Box>

      {/* Fullscreen Dialog */}
      <Dialog
        open={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {alt}
          <IconButton onClick={() => setShowFullscreen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh'
                }}
              />
            ) : (
              <img
                src={mediaUrl}
                alt={alt}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
} 