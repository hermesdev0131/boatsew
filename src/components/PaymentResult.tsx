'use client'

import React from 'react'
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Stack
} from '@mui/material'
import { CheckCircle, Cancel, ArrowBack, Refresh } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

interface PaymentResultProps {
  success?: boolean
  canceled?: boolean
  orderId?: number
  onRetry?: () => void
}

export default function PaymentResult({ 
  success, 
  canceled, 
  orderId, 
  onRetry 
}: PaymentResultProps) {
  const router = useRouter()

  const handleBackToOrder = () => {
    if (orderId) {
      router.push(`/orders/${orderId}`)
    } else {
      router.push('/orders')
    }
  }

  const handleBackToOrders = () => {
    router.push('/orders')
  }

  if (success) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        p: 3
      }}>
        <Paper sx={{ 
          p: 4, 
          maxWidth: 500, 
          textAlign: 'center',
          borderRadius: 3
        }}>
          <Stack spacing={3}>
            <CheckCircle sx={{ 
              fontSize: 64, 
              color: 'success.main',
              mx: 'auto'
            }} />
            
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              Order Processing
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Your payment has been processed successfully. 
              {orderId && ` Order #${orderId} is now being prepared.`}
            </Typography>

            <Alert severity="success" sx={{ textAlign: 'left' }}>
              <Typography variant="body2">
                You will receive a confirmation message in your order chat. 
                The order status has been updated and your items are being prepared.
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center">
              {orderId && (
                <Button
                  variant="contained"
                  startIcon={<ArrowBack />}
                  onClick={handleBackToOrder}
                >
                  View Order
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleBackToOrders}
              >
                All Orders
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    )
  }

  if (canceled) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        p: 3
      }}>
        <Paper sx={{ 
          p: 4, 
          maxWidth: 500, 
          textAlign: 'center',
          borderRadius: 3
        }}>
          <Stack spacing={3}>
            <Cancel sx={{ 
              fontSize: 64, 
              color: 'error.main',
              mx: 'auto'
            }} />
            
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              Payment Canceled
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Your payment was canceled. No charges were made to your account.
            </Typography>

            <Alert severity="info" sx={{ textAlign: 'left' }}>
              <Typography variant="body2">
                You can try the payment again at any time. Your order remains unchanged.
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center">
              {onRetry && (
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={onRetry}
                >
                  Try Again
                </Button>
              )}
              {orderId && (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={handleBackToOrder}
                >
                  Back to Order
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleBackToOrders}
              >
                All Orders
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    )
  }

  return null
}
