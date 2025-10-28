'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Upload as UploadIcon,
} from '@mui/icons-material'
import { UploadProgress } from '@/types/order'

interface UploadProgressDialogProps {
  open: boolean
  progress: UploadProgress[]
  title?: string
}

export default function UploadProgressDialog({ 
  open, 
  progress, 
  title = 'Uploading Files...' 
}: UploadProgressDialogProps) {
  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />
      case 'error':
        return <ErrorIcon color="error" />
      case 'uploading':
        return <UploadIcon color="primary" />
      default:
        return <PendingIcon color="disabled" />
    }
  }

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      case 'uploading':
        return 'primary'
      default:
        return 'default'
    }
  }

  const completedCount = progress.filter(p => p.status === 'completed').length
  const errorCount = progress.filter(p => p.status === 'error').length
  const totalCount = progress.length

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          {title}
        </Typography>

        {/* Overall Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completedCount}/{totalCount} completed
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(completedCount / totalCount) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* File Progress List */}
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {progress.map((file, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'grey.200', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getStatusIcon(file.status)}
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 'medium' }}>
                  {file.fileName}
                </Typography>
                <Chip 
                  label={file.status} 
                  size="small" 
                  color={getStatusColor(file.status) as any}
                  variant="outlined"
                />
              </Box>
              
              {file.status === 'uploading' && (
                <LinearProgress 
                  variant="indeterminate" 
                  sx={{ height: 4, borderRadius: 2 }}
                />
              )}
              
              {file.status === 'completed' && (
                <LinearProgress 
                  variant="determinate" 
                  value={100}
                  sx={{ height: 4, borderRadius: 2 }}
                  color="success"
                />
              )}
              
              {file.error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    {file.error}
                  </Typography>
                </Alert>
              )}
            </Box>
          ))}
        </Box>

        {/* Summary */}
        {errorCount > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {errorCount} file(s) failed to upload. Please try again.
            </Typography>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  )
} 