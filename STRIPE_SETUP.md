# Stripe Checkout Integration Setup

This guide explains how to set up Stripe Checkout integration with your Supabase edge functions.

## Overview

The integration uses Stripe Checkout for secure payment processing. When users click "Pay with Stripe", they are redirected to Stripe's hosted checkout page where they can complete their payment securely.

## Edge Functions

### 1. create-payment-intent
- **Purpose**: Creates a Stripe Checkout session
- **Location**: `supabase/functions/create-payment-intent/index.ts`
- **Function**: 
  - Validates order exists and is in UNPAID status
  - Fetches order details including outstanding amount
  - Creates a Stripe Checkout session with order information
  - Returns the checkout URL for redirect

### 2. stripe-webhook
- **Purpose**: Handles Stripe webhook events
- **Location**: `supabase/functions/stripe-webhook/index.ts`
- **Events Handled**:
  - `checkout.session.completed`: Updates order when payment is successful
  - `charge.refunded`: Handles refunds

### 3. issue-partial-refund
- **Purpose**: Issues partial refunds for orders
- **Location**: `supabase/functions/issue-partial-refund/index.ts`
- **Function**: Processes refund requests and updates order records

## Environment Variables

Add these to your Supabase project environment variables:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Stripe Dashboard Setup

### 1. Create Webhook Endpoint
1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `charge.refunded`
5. Copy the webhook secret and add it to your environment variables

### 2. Configure Checkout Settings
1. Go to Stripe Dashboard > Settings > Checkout
2. Configure your business information
3. Set up success and cancel URLs (handled by edge function)

## Frontend Integration

### PaymentService
- **Location**: `src/services/paymentService.ts`
- **Function**: 
  - Handles checkout session creation
  - Manages payment redirects
  - Processes payment status from URL parameters

### StripePayment Component
- **Location**: `src/components/StripePayment.tsx`
- **Function**: 
  - Shows payment summary
  - Creates checkout session via PaymentService
  - Redirects to Stripe Checkout

### PaymentResult Component
- **Location**: `src/components/PaymentResult.tsx`
- **Function**: 
  - Displays payment success/cancel states
  - Provides navigation options
  - Handles retry functionality

### Order Pages
- **Main Order Page**: `src/app/orders/[orderId]/page.tsx`
- **Function**: Handle success/canceled redirects from Stripe Checkout

## Payment Flow

1. **User clicks "Pay with Stripe"**
   - Frontend calls `create-payment-intent` edge function
   - Edge function validates order and creates Stripe Checkout session
   - User is redirected to Stripe Checkout

2. **User completes payment on Stripe**
   - Stripe processes payment
   - Stripe sends webhook to `stripe-webhook` edge function

3. **Webhook processes payment**
   - Updates order status and outstanding amount
   - Records payment intent ID
   - Adds confirmation message to order chat

4. **User is redirected back**
   - Success: User sees success message and updated order
   - Canceled: User sees cancel message and can try again

## Database Schema Requirements

Your `orders` table should have these fields:

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'UNPAID',
  outstanding_amount DECIMAL(10,2) DEFAULT 0,
  payment_intent_id TEXT[], -- Array of payment intent IDs
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- ... other fields
);
```

## Testing

### Test Mode
- Use Stripe test keys for development
- Test with Stripe's test card numbers:
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`

### Webhook Testing
- Use Stripe CLI to test webhooks locally:
  ```bash
  stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
  ```

## Security Features

1. **Webhook Verification**: All webhooks are verified using Stripe's signature
2. **Environment Variables**: Sensitive keys stored securely
3. **Order Validation**: Validates order ownership and status
4. **Amount Validation**: Verifies payment amounts match order amounts
5. **CORS Protection**: Proper CORS headers for cross-origin requests

## Key Benefits

1. **Security**: Payment data never touches your servers
2. **Compliance**: Stripe handles PCI compliance
3. **User Experience**: Professional checkout flow
4. **Reliability**: Webhook-based confirmation
5. **Flexibility**: Supports partial payments and refunds

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook endpoint URL
   - Verify webhook secret
   - Check Supabase function logs

2. **Payment not updating order**
   - Check order status is UNPAID
   - Verify webhook is processing correctly
   - Check database permissions

3. **Redirect URLs not working**
   - Verify success/cancel URLs in edge function
   - Check frontend routing

### Logs
- Check Supabase Edge Function logs in the dashboard
- Monitor Stripe webhook delivery in Stripe Dashboard
- Check browser console for frontend errors

## Support

For issues:
1. Check Supabase Edge Function logs
2. Check Stripe Dashboard webhook delivery
3. Verify environment variables
4. Test with Stripe test mode
