import { ChatMessage, ChatMessageWithSender } from '@/types/chat'
import { chatService } from './chatService'
import { readTrackingService } from './readTrackingService'

interface CachedMessages {
  [orderId: number]: {
    messages: ChatMessageWithSender[]
    lastUpdated: string
    isSubscribed: boolean
  }
}

class MessageCacheService {
  private cache: CachedMessages = {}
  private subscriptions: { [orderId: number]: any } = {}
  private currentUserId: string | null = null

  // Initialize the service with current user
  initialize(userId: string) {
    this.currentUserId = userId
    this.loadCacheFromStorage()
  }

  // Load cache from localStorage
  private loadCacheFromStorage() {
    try {
      const cached = localStorage.getItem(`message_cache_${this.currentUserId}`)
      if (cached) {
        this.cache = JSON.parse(cached)
      }
    } catch (error) {
      console.error('Error loading message cache:', error)
      this.cache = {}
    }
  }

  // Save cache to localStorage
  private saveCacheToStorage() {
    try {
      localStorage.setItem(`message_cache_${this.currentUserId}`, JSON.stringify(this.cache))
    } catch (error) {
      console.error('Error saving message cache:', error)
    }
  }

  // Get cached messages for an order
  getCachedMessages(orderId: number): ChatMessageWithSender[] {
    return this.cache[orderId]?.messages || []
  }

  // Get unread count for an order using cached messages (synchronous with cached data)
  // This will be updated by loadReadStatusFromDatabase
  getUnreadCountSync(orderId: number): number {
    if (!this.currentUserId) return 0
    
    const messages = this.getCachedMessages(orderId)
    // First try cache, which should be populated from database
    const lastReadId = readTrackingService.getReadTrackingDataFromCache(this.currentUserId)[orderId]?.lastMessageId
    
    if (!messages || messages.length === 0) return 0
    if (!lastReadId) return messages.filter(msg => !msg.isCurrentUser).length
    
    // Count messages after the last read message that are not from current user
    let unreadCount = 0
    let foundLastRead = false
    
    for (const message of messages) {
      if (message.id === lastReadId) {
        foundLastRead = true
        continue
      }
      if (foundLastRead && !message.isCurrentUser) {
        unreadCount++
      }
    }
    
    return unreadCount
  }

  // Load read status from database and populate cache
  async loadReadStatusFromDatabase(orderIds: number[]): Promise<void> {
    if (!this.currentUserId) return

    try {
      // Load read status for each order from database
      await Promise.all(
        orderIds.map(async (orderId) => {
          const lastReadId = await readTrackingService.getLastMessageId(this.currentUserId!, orderId)
          if (lastReadId) {
            // Update cache with database value
            readTrackingService.updateCache(this.currentUserId!, orderId, lastReadId)
          }
        })
      )
    } catch (error) {
      console.error('Error loading read status from database:', error)
    }
  }

  // Get unread counts for multiple orders (synchronous)
  getUnreadCounts(orderIds: number[]): { [orderId: number]: number } {
    const counts: { [orderId: number]: number } = {}
    
    orderIds.forEach(orderId => {
      counts[orderId] = this.getUnreadCountSync(orderId)
    })
    
    return counts
  }

  // Pre-fetch messages for an order
  async preFetchMessages(orderId: number): Promise<void> {
    if (!this.currentUserId) return

    try {
      // Check if we need to fetch (cache is old or doesn't exist)
      const cached = this.cache[orderId]
      const now = new Date()
      const cacheAge = cached ? now.getTime() - new Date(cached.lastUpdated).getTime() : Infinity
      
      // Fetch if no cache or cache is older than 5 minutes (increased from original)
      if (!cached || cacheAge > 5 * 60 * 1000) {
        const messages = await chatService.getMessagesWithSender(orderId, this.currentUserId)
        
        this.cache[orderId] = {
          messages,
          lastUpdated: now.toISOString(),
          isSubscribed: false
        }
        
        this.saveCacheToStorage()
      }
    } catch (error) {
      console.error(`Error pre-fetching messages for order ${orderId}:`, error)
    }
  }

  // Subscribe to real-time updates for an order
  subscribeToOrder(orderId: number, onUpdate?: (unreadCount: number) => void): void {
    // Skip if already subscribed or no user
    if (!this.currentUserId || this.subscriptions[orderId]) {
      console.log(`Skipping subscription for order ${orderId} - already subscribed or no user`)
      return
    }

    try {
      const subscription = chatService.subscribeToMessages(
        orderId,
        this.currentUserId,
        (message) => {
          // Add new message to cache
          const cached = this.cache[orderId] || { messages: [], lastUpdated: '', isSubscribed: true }
          cached.messages.push(message)
          cached.lastUpdated = new Date().toISOString()
          
          this.cache[orderId] = cached
          this.saveCacheToStorage()
          
          // Notify callback with new unread count
          if (onUpdate) {
            const unreadCount = this.getUnreadCountSync(orderId)
            onUpdate(unreadCount)
          }
        },
        (error) => {
          console.error(`Error in subscription for order ${orderId}:`, error)
        },
        () => {
          // Connected
        },
        () => {
          // Disconnected
        },
        true, // Enable fallback polling
        10000 // Longer connection timeout (10 seconds)
      )

      this.subscriptions[orderId] = subscription
      
      // Mark as subscribed
      if (this.cache[orderId]) {
        this.cache[orderId].isSubscribed = true
      }
    } catch (error) {
      console.error(`Error subscribing to order ${orderId}:`, error)
    }
  }

  // Unsubscribe from an order
  unsubscribeFromOrder(orderId: number): void {
    if (this.subscriptions[orderId]) {
      chatService.unsubscribeFromMessages(orderId)
      delete this.subscriptions[orderId]
      
      if (this.cache[orderId]) {
        this.cache[orderId].isSubscribed = false
      }
    }
  }

  // Subscribe to multiple orders
  subscribeToOrders(orderIds: number[], onUpdate?: (orderId: number, unreadCount: number) => void): void {
    orderIds.forEach(orderId => {
      this.subscribeToOrder(orderId, (unreadCount) => {
        if (onUpdate) {
          onUpdate(orderId, unreadCount)
        }
      })
    })
  }

  // Unsubscribe from all orders
  unsubscribeFromAll(): void {
    Object.keys(this.subscriptions).forEach(orderId => {
      this.unsubscribeFromOrder(parseInt(orderId))
    })
  }

  // Update messages for an order (used when user views the chat)
  updateMessages(orderId: number, messages: ChatMessageWithSender[]): void {
    this.cache[orderId] = {
      messages,
      lastUpdated: new Date().toISOString(),
      isSubscribed: this.cache[orderId]?.isSubscribed || false
    }
    this.saveCacheToStorage()
  }

  // Clear cache for a specific order
  clearOrderCache(orderId: number): void {
    delete this.cache[orderId]
    this.unsubscribeFromOrder(orderId)
    this.saveCacheToStorage()
  }

  // Clear all cache (useful for logout)
  clearAllCache(): void {
    this.cache = {}
    this.unsubscribeFromAll()
    this.currentUserId = null
    
    if (this.currentUserId) {
      localStorage.removeItem(`message_cache_${this.currentUserId}`)
    }
  }

  // Get cache status
  getCacheStatus(): { totalOrders: number; subscribedOrders: number } {
    const orderIds = Object.keys(this.cache)
    const subscribedOrders = orderIds.filter(id => this.cache[parseInt(id)]?.isSubscribed).length
    
    return {
      totalOrders: orderIds.length,
      subscribedOrders
    }
  }
}

// Export singleton instance
export const messageCacheService = new MessageCacheService()
