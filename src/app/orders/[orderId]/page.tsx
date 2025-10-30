'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
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
import { PaymentService } from '@/services/paymentService'
import { Order } from '@/types/order'
import FullscreenPrompt from '@/components/FullscreenPrompt'
import StripePayment from '@/components/StripePayment'

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

export default function OrderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = parseInt(params.orderId as string)
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showPaymentFailure, setShowPaymentFailure] = useState(false)
  const [paymentFailureMessage, setPaymentFailureMessage] = useState('')

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setError('User not authenticated')
        return
      }

      // Check if user is admin
      const adminStatus = await orderService.isAdmin(user.id)
      setIsAdmin(adminStatus)

      // Fetch order based on admin status
      const orderData = adminStatus 
        ? await orderService.getOrderByIdForAdmin(orderId)
        : await orderService.getOrderById(orderId, user.id)
      
      if (orderData) {
        setOrder(orderData)
      } else {
        setError('Order not found')
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
    const paymentStatus = PaymentService.getPaymentStatusFromUrl()
    
    if (paymentStatus.success) {
      // Refresh order data to get updated status
      if (user && orderId) {
        loadOrderDetails()
      }
    } else if (paymentStatus.canceled) {
      // Refresh order data to get updated status
      if (user && orderId) {
        loadOrderDetails()
      }
    } else if (paymentStatus.failed) {
      setPaymentFailureMessage('Payment failed. Please try again.')
      setShowPaymentFailure(true)
    }
  }, [searchParams, user, orderId])

  // Check for payment failures from sessionStorage
  useEffect(() => {
    const failure = PaymentService.getPaymentFailure()
    if (failure) {
      setPaymentFailureMessage(failure.error)
      setShowPaymentFailure(true)
    }
  }, [])

  const handlePayWithStripe = () => {
    setShowPayment(true)
  }

  const handlePaymentSuccess = () => {
    setShowPayment(false)
    // Refresh order data to get updated status
    if (user && orderId) {
      loadOrderDetails()
    }
  }

  const handlePaymentError = (errorMessage: string) => {
    setShowPayment(false)
    PaymentService.handlePaymentFailure(errorMessage)
    setPaymentFailureMessage(errorMessage)
    setShowPaymentFailure(true)
  }

  const handlePaymentClose = () => {
    setShowPayment(false)
  }

  const handlePaymentRetry = () => {
    setShowPayment(true)
  }

  const handlePaymentFailureClose = () => {
    setShowPaymentFailure(false)
    setPaymentFailureMessage('')
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
          {error || 'Order not found'}
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
        <Typography variant="body2" color="text.secondary">
          Order #{order.id} • Created {new Date(order.created_at).toLocaleDateString()}
        </Typography>
      </Paper>

      {/* Payment Required Alert */}
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

      {/* Order Content */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Order Details */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description />
                  Order Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* Order Information Section */}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  Order Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Order #" 
                      secondary={order.id} 
                    />
                  </ListItem>
                  {order.projectname && (
                    <ListItem>
                      <ListItemText 
                        primary="PO number" 
                        secondary={order.projectname} 
                      />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText 
                      primary="Total Cushion Count" 
                      secondary={`${order.cushions_count} cushions (${order.quantity} total pieces)`} 
                    />
                  </ListItem>
                  {order.color && order.color.length > 0 && (
                    <>
                      {order.color.map((color, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={`Color ${index + 1}`} 
                            secondary={color} 
                          />
                        </ListItem>
                      ))}
                    </>
                  )}
                </List>

                {/* Shipping Information Section */}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                  Shipping Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Customer/Company Name" 
                      secondary={order.name} 
                    />
                  </ListItem>
                  {order.company_phone && (
                    <ListItem>
                      <ListItemText 
                        primary="Company Phone" 
                        secondary={order.company_phone} 
                      />
                    </ListItem>
                  )}
                  {order.contact_name && (
                    <ListItem>
                      <ListItemText 
                        primary="Contact Name" 
                        secondary={order.contact_name} 
                      />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText 
                      primary="Address" 
                      secondary={`${order.address}${order.address2 ? `, ${order.address2}` : ''}`} 
                    />
                  </ListItem>
                  {order.country && (
                    <ListItem>
                      <ListItemText 
                        primary="Country" 
                        secondary={order.country} 
                      />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText 
                      primary="City/State/ZIP" 
                      secondary={`${order.city}, ${order.state} ${order.zipcode}`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Phone" 
                      secondary={order.phonenumber} 
                    />
                  </ListItem>
                  {order.email && (
                    <ListItem>
                      <ListItemText 
                        primary="Email" 
                        secondary={order.email} 
                      />
                    </ListItem>
                  )}
                  {order.ship_by_date && (
                    <ListItem>
                      <ListItemText 
                        primary="Ship by Date" 
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            {new Date(order.ship_by_date).toLocaleDateString()}
                            {(() => {
                              const today = new Date()
                              const shipDate = new Date(order.ship_by_date)
                              const daysUntilShip = Math.ceil((shipDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                              let chipColor: 'success' | 'warning' | 'error' = 'error'
                              
                              if (daysUntilShip >= 7) {
                                chipColor = 'success'
                              } else if (daysUntilShip >= 2) {
                                chipColor = 'warning'
                              }
                              
                              return (
                                <Chip 
                                  size="small" 
                                  label={daysUntilShip === 1 ? '1 day' : `${daysUntilShip} days`} 
                                  color={chipColor}
                                  sx={{ fontWeight: 'bold' }}
                                />
                              )
                            })()}
                          </Box>
                        } 
                      />
                    </ListItem>
                  )}
                </List>

                {/* Boat Information Section */}
                {(order.boat_make || order.boat_model || order.boat_year || order.boat_length) && (
                  <>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                      Boat Information
                    </Typography>
                    <List dense>
                      {order.boat_make && (
                        <ListItem>
                          <ListItemText 
                            primary="Make" 
                            secondary={order.boat_make} 
                          />
                        </ListItem>
                      )}
                      {order.boat_model && (
                        <ListItem>
                          <ListItemText 
                            primary="Model" 
                            secondary={order.boat_model} 
                          />
                        </ListItem>
                      )}
                      {order.boat_year && (
                        <ListItem>
                          <ListItemText 
                            primary="Year" 
                            secondary={order.boat_year} 
                          />
                        </ListItem>
                      )}
                      {order.boat_length && (
                        <ListItem>
                          <ListItemText 
                            primary="Length" 
                            secondary={`${order.boat_length} ft`} 
                          />
                        </ListItem>
                      )}
                    </List>
                  </>
                )}

                {/* Order Status Section */}
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 3 }}>
                  Order Status
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Status" 
                      secondary={order.status} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Created" 
                      secondary={new Date(order.created_at).toLocaleString()} 
                    />
                  </ListItem>
                  {order.updated_at && (
                    <ListItem>
                      <ListItemText 
                        primary="Last Updated" 
                        secondary={new Date(order.updated_at).toLocaleString()} 
                      />
                    </ListItem>
                  )}
                  {order.paid_at && (
                    <ListItem>
                      <ListItemText 
                        primary="Paid At" 
                        secondary={new Date(order.paid_at).toLocaleString()} 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>

            {/* Cushion Details */}
            {order.cushions && order.cushions.length > 0 && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chair />
                    Cushion Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    {order.cushions.map((cushion, index) => (
                      <ListItem key={cushion.id || index}>
                        <ListItemText 
                          primary={`${cushion.name} (${cushion.quantity})`}
                          secondary={`Mirrored: ${cushion.mirror ? 'Yes' : 'No'}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Payment Information */}
          <Box sx={{ width: { xs: '100%', md: 350 } }}>
            <Card>
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

      {/* Payment Failure Prompt */}
      <FullscreenPrompt
        open={showPaymentFailure}
        onClose={handlePaymentFailureClose}
        title="Payment Failed"
        message={paymentFailureMessage || 'Your payment could not be processed. Please try again or contact support if the problem persists.'}
        confirmText="Try Again"
        cancelText="Close"
        onConfirm={() => {
          handlePaymentFailureClose()
          setShowPayment(true)
        }}
        onCancel={handlePaymentFailureClose}
        severity="error"
        showCloseButton={true}
      />
    </Box>
  )
}
