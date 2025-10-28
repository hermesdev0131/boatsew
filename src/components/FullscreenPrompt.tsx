'use client'

import React from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'

interface FullscreenPromptProps {
  open: boolean
  onClose: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  severity?: 'info' | 'warning' | 'error' | 'success'
  showCloseButton?: boolean
}

export default function FullscreenPrompt({
  open,
  onClose,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  severity = 'info',
  showCloseButton = true,
}: FullscreenPromptProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    // Don't close if it's a success message (let the redirect handle it)
    if (severity !== 'success') {
      onClose()
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    // Don't close if it's a success message (let the redirect handle it)
    if (severity !== 'success') {
      onClose()
    }
  }

  const getSeverityColor = () => {
    switch (severity) {
      case 'error':
        return '#d32f2f'
      case 'warning':
        return '#ed6c02'
      case 'success':
        return '#2e7d32'
      default:
        return '#1976d2'
    }
  }

  return (
    <Dialog
      open={open}
      onClose={severity === 'success' ? undefined : onClose}
      fullScreen
      PaperProps={{
        sx: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.9)',
        },
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '90%',
          textAlign: 'center',
          position: 'relative',
          border: `2px solid ${getSeverityColor()}`,
        }}
      >
        {showCloseButton && severity !== 'success' && (
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.secondary',
              width: 32,
              height: 32,
              borderRadius: '50%',
            }}
          >
            <CloseIcon />
          </IconButton>
        )}

        {title && (
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ color: getSeverityColor(), fontWeight: 'bold' }}
          >
            {title}
          </Typography>
        )}

        <Typography
          variant="body1"
          sx={{
            mb: 3,
            fontSize: '1.1rem',
            lineHeight: 1.6,
            color: 'text.primary',
          }}
        >
          {message}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {onCancel && (
            <Button
              variant="outlined"
              onClick={handleCancel}
              size="large"
              sx={{ minWidth: 120 }}
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleConfirm}
            size="large"
            sx={{
              minWidth: 120,
              bgcolor: getSeverityColor(),
              '&:hover': {
                bgcolor: getSeverityColor(),
                opacity: 0.9,
              },
            }}
          >
            {confirmText}
          </Button>
        </Box>
      </Paper>
    </Dialog>
  )
} 