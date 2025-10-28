'use client'

import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Fab,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Add as AddIcon, Logout as LogoutIcon } from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import OrderCard from '@/components/OrderCard'
import { orderService } from '@/services/orderService'
import { chatService } from '@/services/chatService'
import { messageCacheService } from '@/services/messageCacheService'
import { Order } from '@/types/order'

export default function OrdersPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<{ [orderId: number]: number }>({})

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        setError(null)
        
        // Initialize message cache service
        messageCacheService.initialize(user.id)
        
        // Check if user is admin
        const adminStatus = await orderService.isAdmin(user.id)
        setIsAdmin(adminStatus)
        
        // Fetch orders based on admin status
        const fetchedOrders = adminStatus 
          ? await orderService.getAllOrders()
          : await orderService.getOrders(user.id)
        
        setOrders(fetchedOrders)

        // Get initial unread counts from cache
        if (fetchedOrders.length > 0) {
          const orderIds = fetchedOrders.map(order => order.id)
          
          // Pre-fetch messages for all orders
          await Promise.all(
            orderIds.map(orderId => messageCacheService.preFetchMessages(orderId))
          )
          
          // Load read status from database (fixes unread count after re-login)
          await messageCacheService.loadReadStatusFromDatabase(orderIds)
          
          // Now get accurate unread counts
          const updatedCounts = messageCacheService.getUnreadCounts(orderIds)
          setUnreadCounts(updatedCounts)
          
          // Subscribe to real-time updates (only once per order)
          const handleUnreadUpdate = (orderId: number, unreadCount: number) => {
            setUnreadCounts(prev => ({
              ...prev,
              [orderId]: unreadCount
            }))
          }
          
          // Unsubscribe first to prevent duplicates
          messageCacheService.unsubscribeFromAll()
          
          // Then subscribe to all orders
          messageCacheService.subscribeToOrders(orderIds, handleUnreadUpdate)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()

    // Cleanup subscriptions on unmount
    return () => {
      messageCacheService.unsubscribeFromAll()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth')
  }

  const handleNewOrder = () => {
    router.push('/orders/new')
  }

  return (
    <ProtectedRoute>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Orders
            </Typography>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {isAdmin ? `Welcome admin ${user?.email}` : `Welcome ${user?.email}`}
            </Typography>
            <IconButton color="inherit" onClick={handleSignOut}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : orders.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No orders found. Create your first order using the button below.
            </Typography>
          ) : (
            <Box>
              {orders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  unreadCount={unreadCounts[order.id] || 0}
                />
              ))}
            </Box>
          )}
        </Container>

        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={handleNewOrder}
        >
          <AddIcon />
        </Fab>
      </Box>
    </ProtectedRoute>
  )
} 