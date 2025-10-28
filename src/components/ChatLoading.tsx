import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

export default function ChatLoading() {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      gap: 2
    }}>
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        Loading chat...
      </Typography>
    </Box>
  )
} 