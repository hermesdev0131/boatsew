import { supabase } from '@/lib/supabase'
import { ChatMessage, ChatMessageWithSender } from '@/types/chat'
import { readTrackingService } from './readTrackingService'

export const chatService = {
  // Fetch chat messages for an order
  async getMessages(orderId: number): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    return data || []
  },

  // Get messages with sender information
  async getMessagesWithSender(orderId: number, currentUserId: string): Promise<ChatMessageWithSender[]> {
    const messages = await this.getMessages(orderId)
    
    // Create messages with sender information
    const messagesWithSender: ChatMessageWithSender[] = messages.map(message => ({
      ...message,
      isCurrentUser: message.sender_id === currentUserId
    }))

    return messagesWithSender
  },

  // Send a new message
  async sendMessage(orderId: number, messageText: string, senderId: string, mediaFileName?: string, mediaType?: string): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        order_id: orderId,
        sender_id: senderId,
        message_text: messageText,
        media_url: mediaFileName,
        media_type: mediaType,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`)
    }

    return data
  },

  // Start polling for new messages (fallback method)
  startPolling(
    orderId: number,
    currentUserId: string,
    onMessage: (message: ChatMessageWithSender) => void,
    onError: (error: string) => void,
    interval: number = 3000 // Poll every 3 seconds
  ) {
    let lastMessageId: number | null = null
    let isPolling = true
    let processedMessageIds = new Set<string>()

    const poll = async () => {
      if (!isPolling) return

      try {
        const messages = await this.getMessages(orderId)
        
        if (messages.length > 0) {
          // Get all messages that are newer than the last processed message
          const newMessages = lastMessageId 
            ? messages.filter(msg => parseInt(msg.id) > lastMessageId!)
            : messages
          
          // Process only messages we haven't seen before
          for (const message of newMessages) {
            const messageKey = `${message.id}-${message.created_at}`
            
            if (!processedMessageIds.has(messageKey)) {
              const messageWithSender: ChatMessageWithSender = {
                ...message,
                isCurrentUser: message.sender_id === currentUserId
              }

              onMessage(messageWithSender)
              processedMessageIds.add(messageKey)
            }
          }
          
          // Update lastMessageId to the highest message ID we've seen
          if (messages.length > 0) {
            lastMessageId = Math.max(...messages.map(msg => parseInt(msg.id)))
          }
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to poll for messages')
      }

      // Schedule next poll
      if (isPolling) {
        setTimeout(poll, interval)
      }
    }

    // Start polling
    poll()

    // Return stop function
    return () => {
      isPolling = false
    }
  },

  // Start polling with initial message ID (internal method)
  startPollingWithInitialId(
    orderId: number,
    currentUserId: string,
    onMessage: (message: ChatMessageWithSender) => void,
    onError: (error: string) => void,
    interval: number = 3000,
    initialLastMessageId: number | null = null
  ) {
    let lastMessageId: number | null = initialLastMessageId
    let isPolling = true
    let processedMessageIds = new Set<string>()

    const poll = async () => {
      if (!isPolling) return

      try {
        const messages = await this.getMessages(orderId)
        
        if (messages.length > 0) {
          // Get all messages that are newer than the last processed message
          const newMessages = lastMessageId 
            ? messages.filter(msg => parseInt(msg.id) > lastMessageId!)
            : []
          
          // Process only messages we haven't seen before
          for (const message of newMessages) {
            const messageKey = `${message.id}-${message.created_at}`
            
            if (!processedMessageIds.has(messageKey)) {
              const messageWithSender: ChatMessageWithSender = {
                ...message,
                isCurrentUser: message.sender_id === currentUserId
              }

              onMessage(messageWithSender)
              processedMessageIds.add(messageKey)
            }
          }
          
          // Update lastMessageId to the highest message ID we've seen
          if (messages.length > 0) {
            lastMessageId = Math.max(...messages.map(msg => parseInt(msg.id)))
          }
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to poll for messages')
      }

      // Schedule next poll
      if (isPolling) {
        setTimeout(poll, interval)
      }
    }

    // Start polling
    poll()

    // Return stop function
    return () => {
      isPolling = false
    }
  },

  // Subscribe to real-time messages for an order with fallback to polling
  subscribeToMessages(
    orderId: number,
    currentUserId: string,
    onMessage: (message: ChatMessageWithSender) => void,
    onError: (error: string) => void,
    onConnected: () => void,
    onDisconnected: () => void,
    fallbackToPolling: boolean = true,
    connectionTimeout: number = 5000, // 5 seconds timeout
    onPollingStarted?: () => void
  ) {
    console.log(`🔌 [Chat] Subscribing to real-time for order ${orderId}`)
    console.log(`⏱️ [Chat] Connection timeout: ${connectionTimeout}ms`)
    console.log(`📡 [Chat] Fallback to polling: ${fallbackToPolling ? 'enabled' : 'disabled'}`)
    
    let connectionTimer: NodeJS.Timeout | null = null
    let stopPolling: (() => void) | null = null
    let isConnected = false

    const startFallbackPolling = () => {
      console.log('📡 Starting fallback polling for chat messages (Order ID: ' + orderId + ')')
      
      // Get current messages to set initial lastMessageId
      this.getMessages(orderId).then(messages => {
        let initialLastMessageId: number | null = null
        if (messages.length > 0) {
          initialLastMessageId = Math.max(...messages.map(msg => parseInt(msg.id)))
          console.log(`📄 Found ${messages.length} existing messages (latest ID: ${initialLastMessageId})`)
        } else {
          console.log('📄 No existing messages found, starting fresh')
        }
        
        stopPolling = this.startPollingWithInitialId(
          orderId,
          currentUserId,
          onMessage,
          onError,
          15000, // Poll every 15 seconds (reduced frequency to prevent infinite requests)
          initialLastMessageId
        )
        console.log('⏰ Polling interval: 15 seconds (checking for new messages every 15s)')
      }).catch(err => {
        console.error('⚠️ Failed to get initial messages for polling:', err)
        // Start polling anyway with null initial ID
        stopPolling = this.startPollingWithInitialId(
          orderId,
          currentUserId,
          onMessage,
          onError,
          15000, // Poll every 15 seconds
          null
        )
        console.log('⏰ Polling interval: 15 seconds (started without initial message context)')
      })
      
      onPollingStarted?.()
      onConnected()
    }

    const handleConnected = () => {
      if (connectionTimer) {
        clearTimeout(connectionTimer)
        connectionTimer = null
      }
      if (stopPolling) {
        stopPolling()
        stopPolling = null
      }
      isConnected = true
      onConnected()
    }

    const handleError = (error: string) => {
      console.error('❌ Real-time chat connection error:', error)
      console.warn('⚠️ Diagnostics for Real-time subscription failure:')
      console.warn('  Order ID:', orderId)
      console.warn('  Channel name: chat:' + orderId)
      console.warn('  User ID:', currentUserId)
      console.warn('')
      console.warn('Possible causes (in order of likelihood):')
      console.warn('  1. Real-time not enabled for "messages" table in Supabase Dashboard')
      console.warn('     → Fix: Enable in Supabase > Project > Realtime > messages')
      console.warn('  2. RLS policies blocking real-time access')
      console.warn('     → Check: auth.uid() in SELECT/INSERT RLS policies')
      console.warn('  3. Network/WebSocket connectivity issues')
      console.warn('     → Check: Browser DevTools > Network tab for WebSocket errors')
      console.warn('  4. Incorrect channel/table filter configuration')
      console.warn('     → Check: filter parameter "order_id=eq.' + orderId + '"')
      console.warn('')
      console.warn('✓ Chat is still working via polling fallback (15 second interval)')
      
      if (fallbackToPolling && !isConnected) {
        console.log('📡 Switching to polling method for reliability...')
        startFallbackPolling()
      } else {
        onError(error)
      }
    }

    const handleDisconnected = () => {
      isConnected = false
      if (fallbackToPolling && !stopPolling) {
        console.log('Real-time connection lost, switching to polling...')
        startFallbackPolling()
      }
      onDisconnected()
    }

    // Set connection timeout
    if (fallbackToPolling) {
      connectionTimer = setTimeout(() => {
        if (!isConnected) {
          console.warn(`⏱️ Real-time connection timeout (${connectionTimeout}ms) for order ${orderId}`)
          console.warn('⚠️ This suggests WebSocket connectivity issues. Possible causes:')
          console.warn('  • Firewall/network blocking WebSocket connections')
          console.warn('  • Supabase project WebSocket endpoint unreachable')
          console.warn('  • Browser WebSocket API not working')
          console.log('📡 Switching to polling fallback as backup...')
          startFallbackPolling()
        }
      }, connectionTimeout)
    }

    const channel = supabase
      .channel(`chat:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${orderId}`
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage

          const messageWithSender: ChatMessageWithSender = {
            ...newMessage,
            isCurrentUser: newMessage.sender_id === currentUserId
          }

          onMessage(messageWithSender)
        }
      )
      .on('presence', { event: 'sync' }, () => {
        handleConnected()
      })
      .on('presence', { event: 'join' }, () => {
        handleConnected()
      })
      .on('presence', { event: 'leave' }, () => {
        handleDisconnected()
      })
      .on('system', { event: 'disconnect' }, () => {
        handleDisconnected()
        // Auto-reconnect after a short delay
        setTimeout(() => {
          console.log('Attempting to reconnect to chat...')
          this.subscribeToMessages(orderId, currentUserId, onMessage, onError, onConnected, onDisconnected, fallbackToPolling, connectionTimeout)
        }, 3000)
      })

    return channel.subscribe((status) => {
      const timestamp = new Date().toLocaleTimeString()
      console.log(`[Chat ${timestamp}] Channel status: ${status}`)
      
      if (status === 'SUBSCRIBED') {
        console.log(`✅ [Chat] Real-time connection established for order ${orderId}`)
        handleConnected()
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ [Chat] Real-time connection failed for order ${orderId}`)
        console.log('[Chat] This typically indicates:')
        console.log('  • Real-time not enabled on messages table, OR')
        console.log('  • WebSocket connection blocked by network/firewall, OR')
        console.log('  • RLS policies preventing subscription')
        handleError('Failed to connect to chat')
      } else if (status === 'CLOSED') {
        console.log(`⚠️ [Chat] Channel closed for order ${orderId}`)
        handleDisconnected()
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏱️ [Chat] Connection timeout for order ${orderId} - WebSocket may be slow/blocked`)
        handleError('Connection timeout')
      }
    })
  },

  // Unsubscribe from real-time messages
  unsubscribeFromMessages(orderId: number) {
    const channel = supabase.channel(`chat:${orderId}`)
    supabase.removeChannel(channel)
  },

  // Get unread count for an order
  async getUnreadCount(orderId: number, currentUserId: string): Promise<number> {
    try {
      const messages = await this.getMessages(orderId)
      return await readTrackingService.getUnreadCount(currentUserId, orderId, messages)
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  },

  // Get unread counts for multiple orders
  async getUnreadCounts(orderIds: number[], currentUserId: string): Promise<{ [orderId: number]: number }> {
    const unreadCounts: { [orderId: number]: number } = {}
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 5
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (orderId) => {
          try {
            const count = await this.getUnreadCount(orderId, currentUserId)
            unreadCounts[orderId] = count
          } catch (error) {
            console.error(`Error getting unread count for order ${orderId}:`, error)
            unreadCounts[orderId] = 0
          }
        })
      )
    }
    
    return unreadCounts
  },

  // Mark messages as read for an order
  async markMessagesAsRead(orderId: number, currentUserId: string, lastMessageId?: string): Promise<void> {
    try {
      if (!lastMessageId) {
        // If no lastMessageId provided, mark all messages as read
        const messages = await this.getMessages(orderId)
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          await readTrackingService.markAsRead(currentUserId, orderId, lastMessage.id)
        }
      } else {
        await readTrackingService.markAsRead(currentUserId, orderId, lastMessageId)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }
}
