'use client'

import React, { useState, useRef } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Divider,
  Dialog,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  PlayCircle as VideoIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material'
import { NewOrderFormData, Cushion, VideoFile } from '@/types/order'
import VideoCapture from '@/components/VideoCapture'
import { videoService } from '@/services/videoService'

interface ProjectDetailsPageProps {
  formData: NewOrderFormData
  setFormData: React.Dispatch<React.SetStateAction<NewOrderFormData>>
  showPrompt: (title: string, message: string, severity?: 'error' | 'warning' | 'info' | 'success') => void
}

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.flv', '.wmv']

export default function ProjectDetailsPage({
  formData,
  setFormData,
  showPrompt,
}: ProjectDetailsPageProps) {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const [guideOpen, setGuideOpen] = useState(false)
  const [videoCaptureOpen, setVideoCaptureOpen] = useState(false)
  const [currentCushionId, setCurrentCushionId] = useState<string>('')
  const [processingVideo, setProcessingVideo] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<string>('')

  const handlePurchaseOrderChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      purchaseOrderNumber: value,
    }))
  }

  const handleVideoUploadGuide = () => {
    setGuideOpen(true)
  }

  const handleDownloadImage = async () => {
    try {
      const response = await fetch('https://owndlaatehbssfvqawuz.supabase.co/storage/v1/object/public/pub/scalecross.png')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'scalecross.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  const handleSendToPrinter = () => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        showPrompt('Print Error', 'Unable to open print window. Please check your popup blocker settings.', 'error')
        return
      }

      // Create the print content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Scale Cross Reference</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
              background: white;
            }
            .print-container {
              max-width: 100%;
              margin: 0 auto;
            }
            .print-image {
              max-width: 100%;
              height: auto;
              border: 1px solid #ccc;
              display: block;
              margin: 0 auto;
            }
            .print-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .print-instructions {
              font-size: 16px;
              margin: 20px 0;
              text-align: left;
              max-width: 600px;
              margin-left: auto;
              margin-right: auto;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 10px;
              }
              .print-container { 
                max-width: none; 
              }
              .print-image {
                max-width: 100%;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="print-title">Scale Cross Reference</div>
            <div class="print-instructions">
              <p><strong>Instructions:</strong></p>
              <ul>
                <li>Print this page at 100% scale (no scaling)</li>
                <li>Place this reference next to your object when recording video</li>
                <li>Ensure the reference is clearly visible in your video</li>
                <li>This helps us accurately measure and scale your object</li>
              </ul>
            </div>
            <img 
              src="https://owndlaatehbssfvqawuz.supabase.co/storage/v1/object/public/pub/scalecross.png" 
              alt="Scale Cross Reference" 
              class="print-image"
              id="printImage"
            />
          </div>
          <script>
            const img = document.getElementById('printImage');
            img.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
            img.onerror = function() {
              alert('Failed to load image. Please try again.');
              window.close();
            };
          </script>
        </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()
    } catch (error) {
      console.error('Error printing:', error)
      showPrompt('Print Error', 'Failed to open print dialog. Please try again.', 'error')
    }
  }

  const handleVideoCapture = (cushionId: string) => {
    setCurrentCushionId(cushionId)
    setVideoCaptureOpen(true)
  }

  const handleVideoCaptured = (file: File) => {
    const videoFile: VideoFile = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }

    updateCushion(currentCushionId, {
      videos: [...formData.cushions.find(c => c.id === currentCushionId)!.videos, videoFile],
    })
  }

  const addCushion = () => {
    const newCushionId = (formData.cushions.length + 1).toString()
    const cushionName = `Cushion ${String.fromCharCode(64 + formData.cushions.length + 1)}` // A, B, C, etc.
    
    const newCushion: Cushion = {
      id: newCushionId,
      name: cushionName,
      quantity: 1,
      isMirrored: false,
      videos: [],
    }

    setFormData(prev => ({
      ...prev,
      cushions: [...prev.cushions, newCushion],
    }))
  }

  const removeCushion = (cushionId: string) => {
    if (formData.cushions.length > 1) {
      setFormData(prev => ({
        ...prev,
        cushions: prev.cushions.filter(c => c.id !== cushionId),
      }))
    }
  }

  const updateCushion = (cushionId: string, updates: Partial<Cushion>) => {
    setFormData(prev => ({
      ...prev,
      cushions: prev.cushions.map(c =>
        c.id === cushionId ? { ...c, ...updates } : c
      ),
    }))
  }

  const handleVideoSelect = async (cushionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setProcessingVideo(true)

    try {
      const newVideos: VideoFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        
        // Check file format
        if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
          showPrompt(
            'Invalid Video Format',
            `The file "${file.name}" has an unsupported format. Please use: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`,
            'error'
          )
          continue
        }

        // Check video duration
        setProcessingProgress(`Checking video duration for ${file.name}...`)
        const duration = await videoService.getVideoDuration(file)
        
        // Video must be at least 2 minutes (120 seconds)
        if (duration < 120) {
          showPrompt(
            'Video Too Short',
            `The video "${file.name}" is only ${Math.round(duration)} seconds long. Videos must be at least 2 minutes (120 seconds) in length.`,
            'error'
          )
          continue
        }

        let processedFile = file
        let processedName = file.name

        // If video is longer than 2 minutes, trim it to exactly 2 minutes
        if (duration > 120) {
          setProcessingProgress(`Trimming "${file.name}" to 2 minutes...`)
          const trimmedBlob = await videoService.trimVideoTo2Minutes(file)
          processedFile = new File([trimmedBlob], file.name.replace(/\.[^/.]+$/, '') + '_trimmed.mp4', {
            type: 'video/mp4'
          })
          processedName = processedFile.name
          
          showPrompt(
            'Video Trimmed',
            `The video "${file.name}" was ${Math.round(duration)} seconds long and has been automatically trimmed to 2 minutes (120 seconds).`,
            'info'
          )
        }

        const videoFile: VideoFile = {
          id: Math.random().toString(36).substr(2, 9),
          file: processedFile,
          name: processedName,
          size: processedFile.size,
          type: processedFile.type,
        }
        newVideos.push(videoFile)
      }

      if (newVideos.length > 0) {
        updateCushion(cushionId, {
          videos: [...formData.cushions.find(c => c.id === cushionId)!.videos, ...newVideos],
        })
      }
    } catch (error) {
      showPrompt(
        'Video Processing Error',
        error instanceof Error ? error.message : 'Failed to process video. Please try again.',
        'error'
      )
    } finally {
      setProcessingVideo(false)
      setProcessingProgress('')
      
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const removeVideo = (cushionId: string, videoId: string) => {
    updateCushion(cushionId, {
      videos: formData.cushions.find(c => c.id === cushionId)!.videos.filter(v => v.id !== videoId),
    })
  }

  const getTotalCushionCount = () => {
    return formData.cushions.reduce((total, cushion) => {
      return total + (cushion.isMirrored ? cushion.quantity * 2 : cushion.quantity)
    }, 0)
  }

  return (
    <Box>

      {/* Purchase Order Number */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Purchase Order Number"
          value={formData.purchaseOrderNumber || ''}
          onChange={(e) => handlePurchaseOrderChange(e.target.value)}
          placeholder="Enter purchase order number"
        />
      </Box>

      {/* Video Upload Guide Button */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          onClick={handleVideoUploadGuide}
          startIcon={<VideoIcon />}
          size="large"
        >
          Video Uploading Guide
        </Button>
      </Box>

      {/* Total Cushions Count */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Total Cushions: {getTotalCushionCount()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formData.cushions.map(c => 
            `${c.name}: ${c.quantity}${c.isMirrored ? ' (mirrored ×2)' : ''}`
          ).join(', ')}
        </Typography>
      </Box>

      {/* Cushions Section */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Cushions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addCushion}
          >
            Add Cushion
          </Button>
        </Box>

        {formData.cushions.map((cushion, index) => (
          <Paper key={cushion.id} elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.300' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                {cushion.name}
              </Typography>
              {formData.cushions.length > 1 && (
                <IconButton
                  color="error"
                  onClick={() => removeCushion(cushion.id)}
                  size="small"
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Quantity of identical cushions:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => updateCushion(cushion.id, { quantity: Math.max(1, cushion.quantity - 1) })}
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'grey.300',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                  }}
                >
                  -
                </IconButton>
                <TextField
                  value={cushion.quantity}
                  onChange={(e) => updateCushion(cushion.id, { quantity: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, style: { textAlign: 'center' } }}
                  size="small"
                  sx={{ 
                    width: 80,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'grey.300',
                      },
                    },
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => updateCushion(cushion.id, { quantity: cushion.quantity + 1 })}
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'grey.300',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                  }}
                >
                  +
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Mirror:
              </Typography>
              <Switch
                checked={cushion.isMirrored}
                onChange={(e) => updateCushion(cushion.id, { isMirrored: e.target.checked })}
                size="small"
              />
            </Box>

            {/* Video Upload Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Add Scan Videos
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Take Video Button */}
                <Button
                  variant="outlined"
                  onClick={() => handleVideoCapture(cushion.id)}
                  sx={{
                    width: 120,
                    height: 120,
                    borderStyle: 'dashed',
                    borderWidth: 1,
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'white',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'grey.50',
                    },
                  }}
                >
                  <VideocamIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                  <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                    Take Video
                  </Typography>
                </Button>

                {/* Choose Video Button */}
                <input
                  ref={(el) => { fileInputRefs.current[cushion.id] = el }}
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(e) => handleVideoSelect(cushion.id, e)}
                  style={{ display: 'none' }}
                />
                
                <Button
                  variant="outlined"
                  onClick={() => fileInputRefs.current[cushion.id]?.click()}
                  sx={{
                    width: 120,
                    height: 120,
                    borderStyle: 'dashed',
                    borderWidth: 1,
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'white',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'grey.50',
                    },
                  }}
                >
                  <UploadIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                  <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                    Choose Video
                  </Typography>
                </Button>
              </Box>
            </Box>

            {/* Uploaded Videos */}
            {cushion.videos.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Uploaded Videos:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {cushion.videos.map((video) => (
                    <Chip
                      key={video.id}
                      label={video.name}
                      onDelete={() => removeVideo(cushion.id, video.id)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        ))}
      </Box>

      {/* Video Upload Guide Dialog */}
      <Dialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        fullScreen
      >
        <Box sx={{ 
          height: '100vh', 
          width: '100vw', 
          display: 'flex', 
          flexDirection: 'column',
          p: 3,
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Video Uploading Guide
            </Typography>
            <IconButton
              onClick={() => setGuideOpen(false)}
              sx={{
                color: 'text.secondary',
                width: 40,
                height: 40,
                borderRadius: '50%',
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Info Alert */}
          <Alert 
            severity="info" 
            icon={<InfoIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              A 2 minute video of what you'd like to scan. Pivot around the object slowly, capturing every angle.{'\n'}
              Scan tips: Don't move the phone too fast. Take your time to film the video, in order to provide a complete scan.
            </Typography>
          </Alert>

          {/* Image */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flex: 1,
            mb: 2,
            overflow: 'hidden'
          }}>
            <img
              src="https://owndlaatehbssfvqawuz.supabase.co/storage/v1/object/public/pub/scalecross.png"
              alt="Scale Cross Reference"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                height: 'auto',
                borderRadius: 8,
                objectFit: 'contain',
              }}
            />
          </Box>

          {/* Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadImage}
            >
              Download Image
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handleSendToPrinter}
            >
              Send to Printer
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Video Capture Dialog */}
      <VideoCapture
        open={videoCaptureOpen}
        onClose={() => setVideoCaptureOpen(false)}
        onVideoCaptured={handleVideoCaptured}
      />

      {/* Video Processing Overlay */}
      {processingVideo && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            gap: 2,
          }}
        >
          <CircularProgress size={60} sx={{ color: 'white' }} />
          <Typography variant="h6" sx={{ color: 'white', textAlign: 'center', px: 2 }}>
            {processingProgress || 'Processing video...'}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
