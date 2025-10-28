'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  CircularProgress
} from '@mui/material'
import { ArrowBack, AccessTime } from '@mui/icons-material'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order_id')

  const handleReturnToOrder = () => {
    if (orderId) {
      router.push(`/orders/${orderId}`)
    } else {
      router.push('/orders')
    }
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: 'grey.800',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      p: 3
    }}>
      <Paper sx={{ 
        p: 6, 
        maxWidth: 500, 
        width: '100%',
        textAlign: 'center',
        borderRadius: 3,
        boxShadow: 3,
        bgcolor: 'grey.100'
      }}>
        <Stack spacing={4}>
          {/* Order Processing Status */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2
          }}>
            <AccessTime sx={{ fontSize: 28, color: 'black' }} />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold',
                color: 'black'
              }}
            >
              Order processing
            </Typography>
          </Box>

          {/* Return Button */}
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={handleReturnToOrder}
            sx={{ 
              py: 2,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              bgcolor: '#1976d2',
              '&:hover': {
                bgcolor: '#1565c0'
              }
            }}
          >
            Return to order
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'grey.800'
      }}>
        <CircularProgress />
      </Box>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
