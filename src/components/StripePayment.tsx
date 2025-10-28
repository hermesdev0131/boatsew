'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Stack,
  Divider
} from '@mui/material'
import { Close, Payment, Lock, Security, CheckCircle } from '@mui/icons-material'
import { PaymentService } from '../services/paymentService'
import { useAuth } from '../contexts/AuthContext'

interface StripePaymentProps {
  orderId: number
  amount: number
  onSuccess: () => void
  onError: (message: string) => void
  onClose: () => void
}

export default function StripePayment({ orderId, amount, onSuccess, onError, onClose }: StripePaymentProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Creating checkout session for order:', orderId)
      
      // Create checkout session using PaymentService
      const checkoutSession = await PaymentService.createCheckoutSession({
        orderId,
        successUrl: `${window.location.origin}/payment/success?order_id=${orderId}`,
        cancelUrl: `${window.location.origin}/orders/${orderId}?canceled=true`,
      })

      console.log('Checkout session created:', checkoutSession)
      
      // Redirect to Stripe Checkout
      PaymentService.redirectToCheckout(checkoutSession.url)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)
      onError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={true} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 600
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'grey.200'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Complete Payment
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <Stack spacing={3}>
          {/* Payment Summary */}
          <Box sx={{ 
            p: 3, 
            bgcolor: 'grey.50', 
            borderRadius: 2, 
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <Payment sx={{ mr: 1 }} />
              Payment Summary
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">Outstanding Amount</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                ${amount.toFixed(2)}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Order #{orderId}
            </Typography>
          </Box>

          {/* Checkout Information */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Secure Checkout
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You'll be redirected to Stripe's secure checkout page to complete your payment. 
              Your payment information is encrypted and secure.
            </Typography>
          </Box>

          {/* Security Features */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'success.50', 
            borderRadius: 2, 
            border: '1px solid',
            borderColor: 'success.200'
          }}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                <Typography variant="body2" color="success.main">
                  PCI DSS compliant payment processing
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                <Typography variant="body2" color="success.main">
                  Encrypted payment data
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                <Typography variant="body2" color="success.main">
                  Secure checkout hosted by Stripe
                </Typography>
              </Box>
            </Stack>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', pt: 2 }}>
            <Button 
              onClick={onClose} 
              disabled={loading}
              variant="outlined"
              sx={{ minWidth: 120 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Lock />}
              sx={{ 
                minWidth: 160,
                py: 1.5,
                px: 3,
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
