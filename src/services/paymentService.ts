import { supabase } from '../lib/supabase'

export interface CreateCheckoutSessionParams {
  orderId: number
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutSessionResponse {
  session_id: string
  url: string
  order_id: number
  amount: number
}

export interface RefundParams {
  orderId: number
  refundAmount: number
}

export interface RefundResponse {
  success: boolean
  refund_id: string
}

export class PaymentService {
  /**
   * Create a Stripe Checkout session for an order
   */
  static async createCheckoutSession({
    orderId,
    successUrl,
    cancelUrl
  }: CreateCheckoutSessionParams): Promise<CheckoutSessionResponse> {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        order_id: orderId,
        success_url: successUrl || `${window.location.origin}/payment/success?order_id=${orderId}`,
        cancel_url: cancelUrl || `${window.location.origin}/orders/${orderId}?canceled=true`,
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to create checkout session')
    }

    if (!data || !data.url) {
      throw new Error('No checkout URL received')
    }

    return data as CheckoutSessionResponse
  }

  /**
   * Issue a partial refund for an order
   */
  static async issueRefund({
    orderId,
    refundAmount
  }: RefundParams): Promise<RefundResponse> {
    const { data, error } = await supabase.functions.invoke('issue-partial-refund', {
      body: {
        order_id: orderId,
        refund_amount: refundAmount
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to issue refund')
    }

    return data as RefundResponse
  }

  /**
   * Redirect to Stripe Checkout
   */
  static redirectToCheckout(checkoutUrl: string): void {
    window.location.href = checkoutUrl
  }

  /**
   * Get payment status from URL parameters
   */
  static getPaymentStatusFromUrl(): { success?: boolean; canceled?: boolean; failed?: boolean } {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      success: urlParams.get('success') === 'true',
      canceled: urlParams.get('canceled') === 'true',
      failed: urlParams.get('failed') === 'true'
    }
  }

  /**
   * Handle payment failure
   */
  static handlePaymentFailure(error: string): void {
    // Store failure state in sessionStorage for the FullscreenPrompt to pick up
    sessionStorage.setItem('paymentFailure', JSON.stringify({
      error,
      timestamp: Date.now()
    }))
  }

  /**
   * Check if there's a payment failure to display
   */
  static getPaymentFailure(): { error: string; timestamp: number } | null {
    const failure = sessionStorage.getItem('paymentFailure')
    if (failure) {
      sessionStorage.removeItem('paymentFailure')
      return JSON.parse(failure)
    }
    return null
  }
}
