'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material'
import { Send, ArrowBack } from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { chatService } from '@/services/chatService'
import { messageCacheService } from '@/services/messageCacheService'
import { ChatMessageWithSender } from '@/types/chat'
import { orderService } from '@/services/orderService'
import { Order, OrderStatus } from '@/types/order'
import { supabase } from '@/lib/supabase'
import ChatLoading from '@/components/ChatLoading'
import MessageBubble from '@/components/MessageBubble'
import MediaUpload from '@/components/MediaUpload'

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

function ChatPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = parseInt(searchParams.get('orderId') || '0')
  
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [usingPolling, setUsingPolling] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('')
  const [saving, setSaving] = useState(false)
  const [showAmountInput, setShowAmountInput] = useState<null | 'outstanding' | 'refund'>(null)
  const [amountValue, setAmountValue] = useState<string>('')

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Mark messages as read when user views the chat
  useEffect(() => {
    if (messages.length > 0 && user) {
      const lastMessage = messages[messages.length - 1]
      // Fire and forget - mark messages as read in background
      chatService.markMessagesAsRead(orderId, user.id, lastMessage.id).catch(err => {
        console.error('Failed to mark messages as read:', err)
      })
    }
  }, [messages, orderId, user])

  // Load order details and messages
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Check if user is admin
        const adminStatus = await orderService.isAdmin(user!.id)
        setIsAdmin(adminStatus)

        // Load order details based on admin status
        const orderData = adminStatus 
          ? await orderService.getOrderByIdForAdmin(orderId)
          : await orderService.getOrderById(orderId, user!.id)
        
        if (orderData) {
          setOrder(orderData)
        }

        // Load existing messages with sender information (try cache first)
        let messagesWithSender = messageCacheService.getCachedMessages(orderId)
        if (messagesWithSender.length === 0) {
          messagesWithSender = await chatService.getMessagesWithSender(orderId, user!.id)
          messageCacheService.updateMessages(orderId, messagesWithSender)
        }
        setMessages(messagesWithSender)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    if (user && orderId) {
      loadData()
    }
  }, [orderId, user])

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user || !orderId) return

    const handleNewMessage = (message: ChatMessageWithSender) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(existingMessage => 
          existingMessage.id === message.id && 
          existingMessage.created_at === message.created_at
        )
        
        if (messageExists) {
          return prev // Don't add duplicate
        }
        
        const newMessages = [...prev, message]
        // Update cache with new messages
        messageCacheService.updateMessages(orderId, newMessages)
        return newMessages
      })
    }

    const handleError = (error: string) => {
      setError(error)
    }

    const handleConnected = () => {
      setConnected(true)
      setError(null)
    }

    const handleDisconnected = () => {
      setConnected(false)
    }

    const handlePollingStarted = () => {
      setUsingPolling(true)
    }

    const subscription = chatService.subscribeToMessages(
      orderId,
      user.id,
      handleNewMessage,
      handleError,
      handleConnected,
      handleDisconnected,
      true, // Enable fallback polling
      5000, // 5 second connection timeout
      handlePollingStarted
    )

    return () => {
      chatService.unsubscribeFromMessages(orderId)
    }
  }, [orderId, user])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    try {
      setSending(true)
      await chatService.sendMessage(
        orderId, 
        newMessage.trim(), 
        user.id
      )
      setNewMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleMediaUploaded = async (fileName: string, mediaType: string) => {
    if (!user || sending) return

    try {
      setSending(true)
      await chatService.sendMessage(
        orderId, 
        '', // Empty message for media-only
        user.id, 
        fileName, 
        mediaType
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send media')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleViewDetails = () => {
    router.push(`/chat/orderdetails?orderId=${orderId}`)
  }

  const handleOpenEdit = () => {
    if (!order) return
    setSelectedStatus(order.status)
    setEditOpen(true)
  }

  const handleCloseEdit = () => {
    if (saving) return
    setEditOpen(false)
    setShowAmountInput(null)
    setAmountValue('')
  }

  const handleSaveStatus = async () => {
    if (!order || !isAdmin || !selectedStatus || saving) return
    try {
      setSaving(true)
      if (showAmountInput === 'outstanding') {
        const amount = Number(amountValue)
        if (!Number.isFinite(amount) || amount < 0) {
          throw new Error('Enter a valid non-negative amount')
        }
        await orderService.updateOutstandingAmountAdmin(order.id, amount)
        setOrder({ ...order, outstanding_amount: amount, status: 'UNPAID' })
        await chatService.sendMessage(
          order.id,
          `Outstanding amount set to $${amount.toFixed(2)}. Status set to UNPAID.`,
          user!.id
        )
      } else if (showAmountInput === 'refund') {
        const amount = Number(amountValue)
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Enter a valid positive amount')
        }
        
        console.log('Calling partial refund function with:', {
          order_id: order.id,
          refund_amount: amount
        })
        
        const { data, error } = await supabase.functions.invoke('issue-partial-refund', {
          body: {
            order_id: order.id,
            refund_amount: amount
          }
        })
        
        console.log('Partial refund response:', { data, error })
        
        if (error) {
          throw new Error(error.message || 'Failed to issue partial refund')
        }
        
        await chatService.sendMessage(
          order.id,
          `A partial refund of $${amount.toFixed(2)} has been initiated.`,
          user!.id
        )
      } else {
        const previousStatus = order.status
        await orderService.updateOrderStatusAdmin(order.id, selectedStatus)
        setOrder({ ...order, status: selectedStatus })
        await chatService.sendMessage(
          order.id,
          `Order status changed from ${previousStatus} to ${selectedStatus}.`,
          user!.id
        )
      }
      setShowAmountInput(null)
      setAmountValue('')
      setEditOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status')
    } finally {
      setSaving(false)
    }
  }

  const handleSetOutstandingAmount = async () => {
    if (!order || !isAdmin) return
    setShowAmountInput('outstanding')
    setSelectedStatus('UNPAID')
  }

  const handlePartialRefund = async () => {
    if (!order || !isAdmin) return
    setShowAmountInput('refund')
  }

  

  if (loading) {
    return <ChatLoading />
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Header */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        {/* Back Button and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => router.push('/orders')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Order Details
          </Typography>
          {connected ? (
            usingPolling ? (
              <Chip label="Polling" size="small" color="info" />
            ) : (
              <Chip label="Connected" size="small" color="success" />
            )
          ) : (
            <Chip label="Connecting..." size="small" color="warning" />
          )}
        </Box>

        {/* Project Name and Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', flex: 1 }}>
            {order.projectname || 'Untitled'}
          </Typography>
          <Chip 
            label={order.status} 
            color={getStatusColor(order.status) as any}
            size="medium"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {/* Order Details */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Order #{order.id}
          </Typography>
          {order.color && order.color.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Colors: {order.color.join(', ')}
            </Typography>
          )}
        </Box>

        {/* Divider */}
        <Divider sx={{ mb: 2 }} />

        {/* View/Edit Details Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          {isAdmin && (
            <Button
              variant="text"
              onClick={handleOpenEdit}
              sx={{ 
                color: 'warning.main',
                fontWeight: 'bold',
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              Edit Details
            </Button>
          )}
          <Button
            variant="text"
            onClick={handleViewDetails}
            sx={{ 
              color: 'primary.main',
              fontWeight: 'bold',
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            View Details
          </Button>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Messages with Mask Fade Effect */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pt: 2,
        pb: 1,
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)'
      }}>
        {messages.map((message, index) => (
          <MessageBubble key={message.id} message={message} index={index} orderId={orderId} />
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <MediaUpload
            orderId={orderId}
            onMediaUploaded={handleMediaUploaded}
            disabled={sending || !connected}
          />
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || !connected}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || !connected}
            color="primary"
            sx={{ 
              alignSelf: 'flex-end',
              minWidth: 48,
              height: 48
            }}
          >
            {sending ? <CircularProgress size={20} /> : <Send />}
          </IconButton>
        </Box>
      </Paper>

      {/* Edit Details Modal Dialog */}
      <Dialog open={editOpen} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit Order Details</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={handleSetOutstandingAmount}>Set Outstanding Amount</Button>
            <Button variant="outlined" onClick={handlePartialRefund}>Partial Refund</Button>
          </Stack>
          {showAmountInput && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                type="number"
                label={showAmountInput === 'outstanding' ? 'Outstanding Amount' : 'Refund Amount'}
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Stack>
          )}
          <FormControl fullWidth>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              label="Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
            >
              <MenuItem value={'UNPAID'}>UNPAID</MenuItem>
              <MenuItem value={'PAID'}>PAID</MenuItem>
              <MenuItem value={'PREPARING'}>PREPARING</MenuItem>
              <MenuItem value={'SHIPPING'}>SHIPPING</MenuItem>
              <MenuItem value={'DELIVERED'}>DELIVERED</MenuItem>
              <MenuItem value={'CANCELLED'}>CANCELLED</MenuItem>
              <MenuItem value={'RETURNED'}>RETURNED</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveStatus} variant="contained" disabled={saving || !selectedStatus || (showAmountInput !== null && amountValue === '')}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatPageContent />
    </Suspense>
  )
} 