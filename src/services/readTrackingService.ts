import { supabase } from '@/lib/supabase'

export interface ReadTrackingData {
  [orderId: number]: {
    lastReadAt: string
    lastMessageId: string // UUID as string
  }
}

export const readTrackingService = {
  // Get the storage key for the current user (for local cache)
  getStorageKey(userId: string): string {
    return `chat_read_tracking_${userId}`
  },

  // Get all read tracking data for a user from localStorage (cache only)
  getReadTrackingDataFromCache(userId: string): ReadTrackingData {
    try {
      const data = localStorage.getItem(this.getStorageKey(userId))
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('Error reading tracking data from cache:', error)
      return {}
    }
  },

  // Update cache with new data
  updateCache(userId: string, orderId: number, lastMessageId: string): void {
    try {
      const data = this.getReadTrackingDataFromCache(userId)
      data[orderId] = {
        lastReadAt: new Date().toISOString(),
        lastMessageId
      }
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(data))
    } catch (error) {
      console.error('Error updating cache:', error)
    }
  },

  // Get last read message ID for a specific order from database
  async getLastMessageId(userId: string, orderId: number): Promise<string | null> {
    try {
      // First check cache for immediate response
      const cacheData = this.getReadTrackingDataFromCache(userId)
      const cachedId = cacheData[orderId]?.lastMessageId || null

      // Fetch from database in background
      const { data, error } = await supabase
        .from('message_reads')
        .select('last_read_message_id')
        .eq('user_id', userId)
        .eq('order_id', orderId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found, return cached value or null
          return cachedId
        }
        console.error('Error fetching read tracking from database:', error)
        return cachedId // Fallback to cache
      }

      // Update cache with database value
      if (data) {
        this.updateCache(userId, orderId, data.last_read_message_id)
        return data.last_read_message_id
      }

      return cachedId
    } catch (error) {
      console.error('Error in getLastMessageId:', error)
      // Fallback to cache
      const cacheData = this.getReadTrackingDataFromCache(userId)
      return cacheData[orderId]?.lastMessageId || null
    }
  },

  // Mark messages as read for a specific order (sync to database)
  async markAsRead(userId: string, orderId: number, lastMessageId: string): Promise<void> {
    try {
      // Update cache immediately for UI responsiveness
      this.updateCache(userId, orderId, lastMessageId)

      // Upsert to database
      const { error } = await supabase
        .from('message_reads')
        .upsert(
          {
            user_id: userId,
            order_id: orderId,
            last_read_message_id: lastMessageId,
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,order_id'
          }
        )

      if (error) {
        console.error('Error saving read tracking to database:', error)
        // Cache is already updated, so UI will still show as read
      }
    } catch (error) {
      console.error('Error in markAsRead:', error)
    }
  },

  // Clear local cache only (not database)
  clearCache(userId: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(userId))
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  },

  // Get unread count for a specific order
  async getUnreadCount(userId: string, orderId: number, messages: any[]): Promise<number> {
    if (!messages || messages.length === 0) return 0

    const lastReadId = await this.getLastMessageId(userId, orderId)
    if (!lastReadId) {
      // If no last read ID, count all messages not from current user
      return messages.filter(msg => !msg.isCurrentUser).length
    }

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
}
