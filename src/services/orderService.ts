import { supabase } from '@/lib/supabase'
import { Order, CreateOrderData } from '@/types/order'

export const orderService = {
  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to check admin status:', error)
      return false
    }

    return data?.is_admin || false
  },

  async getOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }

    return data || []
  },

  async getAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }

    return data || []
  },

  async createOrder(orderData: CreateOrderData, userId: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        user_id: userId,
        status: 'UNPAID',
        payment_intent_id: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`)
    }

    return data
  },

  async getOrderById(orderId: number, userId: string): Promise<Order | null> {
    // First get the order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single()

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return null // Order not found
      }
      throw new Error(`Failed to fetch order: ${orderError.message}`)
    }

    // Then get the cushions for this order
    const { data: cushionsData, error: cushionsError } = await supabase
      .from('cushions')
      .select('*')
      .eq('order_id', orderId)

    if (cushionsError) {
      console.error('Failed to fetch cushions:', cushionsError)
      // Don't fail the entire request if cushions fail to load
    }

    // Combine the data
    return {
      ...orderData,
      cushions: cushionsData || []
    }
  },

  async getOrderByIdForAdmin(orderId: number): Promise<Order | null> {
    // First get the order without user filtering
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return null // Order not found
      }
      throw new Error(`Failed to fetch order: ${orderError.message}`)
    }

    // Then get the cushions for this order
    const { data: cushionsData, error: cushionsError } = await supabase
      .from('cushions')
      .select('*')
      .eq('order_id', orderId)

    if (cushionsError) {
      console.error('Failed to fetch cushions:', cushionsError)
      // Don't fail the entire request if cushions fail to load
    }

    // Combine the data
    return {
      ...orderData,
      cushions: cushionsData || []
    }
  },

  async updateOrderStatus(orderId: number, status: Order['status'], userId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`)
    }
  }
  ,
  async updateOrderStatusAdmin(orderId: number, status: Order['status']): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`)
    }
  }
  ,
  async updateOutstandingAmountAdmin(orderId: number, amount: number): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        outstanding_amount: amount,
        status: 'UNPAID',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) {
      throw new Error(`Failed to set outstanding amount: ${error.message}`)
    }
  }
} 