'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material'
import { Send, ArrowBack } from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { chatService } from '@/services/chatService'
import { messageCacheService } from '@/services/messageCacheService'
import { ChatMessageWithSender } from '@/types/chat'
import { orderService } from '@/services/orderService'
import { Order } from '@/types/order'
import { supabase } from '@/lib/supabase'
import ChatLoading from '@/components/ChatLoading'
import MessageBubble from '@/components/MessageBubble'
import MediaUpload from '@/components/MediaUpload'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const orderId = parseInt(params.orderId as string)
  
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

        // Load existing messages (try cache first)
        let messagesWithSender = messageCacheService.getCachedMessages(orderId)
        if (messagesWithSender.length === 0) {
          const existingMessages = await chatService.getMessages(orderId)
          
          // Process messages to add sender info
          messagesWithSender = existingMessages.map((message) => ({
            ...message,
            isCurrentUser: message.sender_id === user?.id
          }))
          
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

    const subscription = chatService.subscribeToMessages(
      orderId,
      user.id,
      handleNewMessage,
      handleError,
      handleConnected,
      handleDisconnected
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



  if (loading) {
    return <ChatLoading />
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">
            {order?.projectname || 'Untitled'} - Order #{orderId}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip 
              label={order?.status || 'Unknown'} 
              size="small"
              color={order?.status === 'DELIVERED' ? 'success' : 'default'}
            />
            {connected ? (
              <Chip label="Connected" size="small" color="success" />
            ) : (
              <Chip label="Connecting..." size="small" color="warning" />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
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
    </Box>
  )
} 