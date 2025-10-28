'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
} from '@mui/material'
import {
  Videocam as VideocamIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material'

interface VideoCaptureProps {
  open: boolean
  onClose: () => void
  onVideoCaptured: (file: File) => void
}

export default function VideoCapture({ open, onClose, onVideoCaptured }: VideoCaptureProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      
      // First, check if we have permission to access camera
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName })
      
      if (permissions.state === 'denied') {
        setError('Camera access is denied. Please enable camera permissions in your browser settings and try again.')
        return
      }
      
      // Request camera and microphone permissions with highest quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 4096, min: 1920 }, // 4K preferred, Full HD minimum
          height: { ideal: 2160, min: 1080 },
          frameRate: { ideal: 60, min: 30 }, // 60fps preferred, 30fps minimum
          facingMode: 'environment' // Use back camera on mobile devices
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000 // High quality audio
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Use the highest quality codec available
      let mimeType = 'video/webm;codecs=vp9'
      const mimeTypes = [
        'video/webm;codecs=vp9,opus', // VP9 with Opus audio (best quality for WebM)
        'video/webm;codecs=h264,opus', // H.264 fallback
        'video/webm;codecs=vp8,opus', // VP8 fallback
        'video/webm'
      ]
      
      // Find the first supported mime type
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 10000000 // 10 Mbps for high quality
      })
      
      mediaRecorderRef.current = mediaRecorder
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
        setIsRecording(false)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing camera:', err)
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access was denied. Please allow camera permissions and try again.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on your device. Please connect a camera and try again.')
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another application. Please close other apps using the camera and try again.')
        } else {
          setError(`Camera access failed: ${err.message}`)
        }
      } else {
        setError('Failed to access camera. Please ensure camera permissions are granted.')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [isRecording])

  const playRecording = useCallback(() => {
    if (recordedBlob && videoRef.current) {
      videoRef.current.src = URL.createObjectURL(recordedBlob)
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [recordedBlob])

  const handleSaveVideo = useCallback(() => {
    if (recordedBlob) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `captured_video_${timestamp}.webm`
      const file = new File([recordedBlob], fileName, { type: 'video/webm' })
      onVideoCaptured(file)
      onClose()
    }
  }, [recordedBlob, onVideoCaptured, onClose])

  const handleClose = useCallback(() => {
    if (isRecording) {
      stopRecording()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    setRecordedBlob(null)
    setIsRecording(false)
    setIsPlaying(false)
    setError(null)
    onClose()
  }, [isRecording, stopRecording, onClose])

  // Check camera permissions when dialog opens
  React.useEffect(() => {
    if (open) {
      const checkPermissions = async () => {
        try {
          const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName })
          if (permissions.state === 'denied') {
            setError('Camera access is denied. Please enable camera permissions in your browser settings.')
          }
        } catch (err) {
          // Permissions API might not be supported in all browsers
          console.log('Permissions API not supported')
        }
      }
      checkPermissions()
    }
  }, [open])

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Video Capture
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!error && !isRecording && !recordedBlob && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Click "Start Recording" to begin. You'll be asked to allow camera and microphone access.
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              width: '100%',
              maxWidth: 640,
              height: 'auto',
              borderRadius: 8,
              border: '2px solid',
              borderColor: isRecording ? 'error.main' : 'grey.300',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
          {!isRecording && !recordedBlob && (
            <Button
              variant="contained"
              startIcon={<VideocamIcon />}
              onClick={startRecording}
              color="primary"
            >
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button
              variant="contained"
              startIcon={<StopIcon />}
              onClick={stopRecording}
              color="error"
            >
              Stop Recording
            </Button>
          )}



          {recordedBlob && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleSaveVideo}
              color="success"
            >
              Save Video
            </Button>
          )}
        </Box>

        {isRecording && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Recording in progress... Click "Stop Recording" when finished.
          </Alert>
        )}

        {recordedBlob && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Video recorded successfully! Click "Save Video" to add it to your order.
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  )
} 