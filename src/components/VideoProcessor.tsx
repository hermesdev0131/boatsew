'use client'

import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material'
import { CloudUpload as UploadIcon, PlayArrow as PlayIcon } from '@mui/icons-material'
import { videoService, VideoProcessingOptions } from '@/services/videoService'

interface VideoProcessorProps {
  onProcessed?: (blob: Blob) => void
}

export default function VideoProcessor({ onProcessed }: VideoProcessorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<VideoProcessingOptions>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file)
      setVideoUrl(URL.createObjectURL(file))
      setError(null)
    } else {
      setError('Please select a valid video file')
    }
  }

  const handleProcess = async () => {
    if (!selectedFile) return

    try {
      setProcessing(true)
      setProgress(0)
      setError(null)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const processedBlob = await videoService.processVideo(selectedFile, options)
      
      clearInterval(progressInterval)
      setProgress(100)

      if (onProcessed) {
        onProcessed(processedBlob)
      }

      // Create download link
      const url = URL.createObjectURL(processedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `processed_${selectedFile.name}`
      a.click()
      URL.revokeObjectURL(url)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setProcessing(false)
      setProgress(0)
    }
  }

  const handleResizeChange = (dimension: 'width' | 'height') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(event.target.value) || 0
    setOptions(prev => ({
      ...prev,
      resize: {
        width: dimension === 'width' ? value : prev.resize?.width || 0,
        height: dimension === 'height' ? value : prev.resize?.height || 0,
      },
    }))
  }

  const handleQualityChange = (event: Event, value: number | number[]) => {
    setOptions(prev => ({
      ...prev,
      quality: value as number,
    }))
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Video Processor
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          fullWidth
        >
          Select Video File
        </Button>
      </Box>

      {selectedFile && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected: {selectedFile.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </Typography>
        </Box>
      )}

      {videoUrl && (
        <Box sx={{ mb: 3 }}>
          <video
            controls
            style={{ width: '100%', maxHeight: '300px' }}
            src={videoUrl}
          />
        </Box>
      )}

      {selectedFile && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Processing Options
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Width"
              type="number"
              value={options.resize?.width || ''}
              onChange={handleResizeChange('width')}
              disabled={processing}
            />
            <TextField
              fullWidth
              label="Height"
              type="number"
              value={options.resize?.height || ''}
              onChange={handleResizeChange('height')}
              disabled={processing}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              Quality (0-51, lower is better)
            </Typography>
            <Slider
              value={options.quality || 23}
              onChange={handleQualityChange}
              min={0}
              max={51}
              disabled={processing}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>
      )}

      {processing && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Processing... {progress}%
          </Typography>
        </Box>
      )}

      {selectedFile && !processing && (
        <Button
          variant="contained"
          startIcon={<PlayIcon />}
          onClick={handleProcess}
          fullWidth
          size="large"
        >
          Process Video
        </Button>
      )}
    </Paper>
  )
} 