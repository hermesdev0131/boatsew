'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Divider,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material'
import { 
  ArrowBack, 
  Payment, 
  Palette, 
  Chair, 
  Image as ImageIcon,
  VideoFile,
  Description
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { orderService } from '@/services/orderService'
import { Order } from '@/types/order'
import OrderMediaPreview from '@/components/OrderMediaPreview'
import StripePayment from '@/components/StripePayment'
import PaymentResult from '@/components/PaymentResult'

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'UNPAID':
      return 'error'
    case 'PAID':
      return 'warning'
    case 'PREPARING':
      return 'info'
    case 'SHIPPING':
      return 'primary'
    case 'DELIVERED':
      return 'success'
    case 'CANCELLED':
      return 'default'
    case 'RETURNED':
      return 'error'
    default:
      return 'default'
  }
}

function OrderDetailsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = parseInt(searchParams.get('orderId') || '0')
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showPaymentResult, setShowPaymentResult] = useState<{ success: boolean; message?: string } | null>(null)

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is admin
      const adminStatus = await orderService.isAdmin(user!.id)
      setIsAdmin(adminStatus)

      // Fetch order based on admin status
      const orderData = adminStatus 
        ? await orderService.getOrderByIdForAdmin(orderId)
        : await orderService.getOrderById(orderId, user!.id)
      
      if (orderData) {
        setOrder(orderData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && orderId) {
      loadOrderDetails()
    }
  }, [orderId, user])

  // Handle Stripe Checkout redirect parameters
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      setShowPaymentResult({ success: true, message: 'Payment completed successfully! Your order has been updated.' })
      // Refresh order data to get updated status
      if (user && orderId) {
        loadOrderDetails()
      }
    } else if (canceled === 'true') {
      setShowPaymentResult({ success: false, message: 'Payment was canceled. You can try again anytime.' })
    }
  }, [searchParams, user, orderId])

  const handlePayWithStripe = () => {
    setShowPayment(true)
  }

  const handlePaymentSuccess = () => {
    setShowPayment(false)
    setShowPaymentResult({ success: true })
    // Refresh order data to get updated status
    if (user && orderId) {
      loadOrderDetails()
    }
  }

  const handlePaymentError = (errorMessage: string) => {
    setShowPayment(false)
    setShowPaymentResult({ success: false, message: errorMessage })
  }

  const handlePaymentClose = () => {
    setShowPayment(false)
  }

  const handlePaymentResultClose = () => {
    setShowPaymentResult(null)
    // Refresh order data
    if (user && orderId) {
      loadOrderDetails()
    }
  }

  const handlePaymentRetry = () => {
    setShowPaymentResult(null)
    setShowPayment(true)
  }

  const handleBackToOrders = () => {
    router.push('/orders')
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!order) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6" color="error">
          Order not found
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={handleBackToOrders}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" sx={{ flex: 1 }}>
            Order Details
          </Typography>
          <Chip 
            label={order.status} 
            color={getStatusColor(order.status) as any}
            size="medium"
          />
        </Box>
        
        <Typography variant="h6" gutterBottom>
          {order.projectname || 'Untitled'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Order #{order.id}
        </Typography>
      </Paper>

      {/* Payment Alert */}
      {order.outstanding_amount && order.outstanding_amount > 0 && (
        <Box sx={{ m: 2, mb: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Payment Required
            </Typography>
            <Typography variant="body2">
              Outstanding amount: ${order.outstanding_amount.toFixed(2)}
            </Typography>
            <Typography variant="body2">
              Please complete the payment to continue with your order.
            </Typography>
          </Alert>
          <Button
            variant="contained"
            startIcon={<Payment />}
            onClick={handlePayWithStripe}
            fullWidth
          >
            Pay with Stripe
          </Button>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Order Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Palette />
                Order Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Project Name" 
                    secondary={order.projectname || 'Untitled'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Quantity" 
                    secondary={order.quantity} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Colors" 
                    secondary={order.color?.join(', ') || 'None specified'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Cushions Count" 
                    secondary={order.cushions_count || 0} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Created" 
                    secondary={new Date(order.created_at).toLocaleDateString()} 
                  />
                </ListItem>
                {order.paid_at && (
                  <ListItem>
                    <ListItemText 
                      primary="Paid" 
                      secondary={new Date(order.paid_at).toLocaleDateString()} 
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shipping Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Name" 
                    secondary={order.name} 
                  />
                </ListItem>
                                  <ListItem>
                    <ListItemText 
                      primary="Address" 
                      secondary={
                        <Box component="span">
                          <Typography variant="body2" component="span" display="block">{order.address}</Typography>
                          {order.address2 && (
                            <Typography variant="body2" component="span" display="block">{order.address2}</Typography>
                          )}
                          <Typography variant="body2" component="span" display="block">
                            {order.state}, {order.zipcode}
                          </Typography>
                        </Box>
                      } 
                    />
                  </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Phone" 
                    secondary={order.phonenumber} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Cushions Details */}
          {order.cushions && order.cushions.length > 0 && (
            <Card sx={{ gridColumn: '1 / -1' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chair />
                  Cushions ({order.cushions.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {order.cushions.map((cushion, index) => (
                    <Box key={cushion.id || index} sx={{ border: 1, borderColor: 'grey.200', borderRadius: 2, p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {cushion.name} (Qty: {cushion.quantity})
                      </Typography>
                      
                      {cushion.mirror && (
                        <Chip label="Mirrored" size="small" color="primary" sx={{ mb: 2 }} />
                      )}
                      
                      {/* Videos */}
                      {cushion.videos && cushion.videos.length > 0 && cushion.videos.some(v => v && v.trim() !== '') && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Videos ({cushion.videos.filter(v => v && v.trim() !== '').length})
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {cushion.videos
                              .filter(videoFileName => videoFileName && videoFileName.trim() !== '')
                              .map((videoFileName, videoIndex) => (
                              <Box key={videoIndex} sx={{ width: 200 }}>
                                <OrderMediaPreview
                                  fileName={videoFileName}
                                  alt={`${cushion.name} Video ${videoIndex + 1}`}
                                  width="200px"
                                  height="150px"
                                  maxWidth="200px"
                                  maxHeight="150px"
                                />
                                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                                  Video {videoIndex + 1}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Color Images */}
          {order.color_images && Object.keys(order.color_images).filter(key => {
            const value = order.color_images![key]
            return value && value.trim() !== '' && value !== null
          }).length > 0 && (
            <Card sx={{ gridColumn: '1 / -1' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImageIcon />
                  Color Images
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  {Object.entries(order.color_images)
                    .filter(([color, fileName]) => fileName && fileName.trim() !== '' && fileName !== null)
                    .map(([color, fileName]) => {
                    
                    return (
                      <Box key={color} sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <Box sx={{ 
                          width: '100%', 
                          height: '200px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 1,
                          borderColor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}>
                          <OrderMediaPreview
                            fileName={fileName as string}
                            alt={`Color ${color}`}
                            width="100%"
                            height="100%"
                            maxWidth="100%"
                            maxHeight="100%"
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {color}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          <Card sx={{ gridColumn: '1 / -1' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payment />
                Payment Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Status" 
                    secondary={order.status} 
                  />
                </ListItem>
                {order.outstanding_amount && order.outstanding_amount > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Outstanding Amount" 
                      secondary={`$${order.outstanding_amount.toFixed(2)}`} 
                    />
                  </ListItem>
                )}
                {order.payment_intent_id && order.payment_intent_id.length > 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="Payment Intents" 
                      secondary={order.payment_intent_id.join(', ')} 
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Payment Components */}
      {showPayment && order && (
        <StripePayment
          orderId={order.id}
          amount={order.outstanding_amount || 0}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onClose={handlePaymentClose}
        />
      )}

      {showPaymentResult && (
        <PaymentResult
          success={showPaymentResult.success}
          canceled={!showPaymentResult.success}
          orderId={order?.id}
          onRetry={showPaymentResult.success ? undefined : handlePaymentRetry}
        />
      )}
    </Box>
  )
}

export default function OrderDetailsPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <OrderDetailsPageContent />
    </Suspense>
  )
} 