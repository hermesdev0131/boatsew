'use client'

import React from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
} from '@mui/material'
import ProtectedRoute from '@/components/ProtectedRoute'
import VideoProcessor from '@/components/VideoProcessor'

export default function VideoProcessorPage() {
  const handleProcessed = (blob: Blob) => {
    console.log('Video processed:', blob)
    // You can upload the processed video to your server here
  }

  return (
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Video Processor
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Upload and process videos using FFmpeg in the browser. This tool can resize, 
          compress, and apply various effects to your videos.
        </Typography>

        <VideoProcessor onProcessed={handleProcessed} />
      </Container>
    </ProtectedRoute>
  )
} 