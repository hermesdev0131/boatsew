import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@13.10.0';

// Initialize environment variables
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Validate environment variables
if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey || !webhookSecret) {
  console.error('Missing required environment variables');
  throw new Error('Configuration error: Missing environment variables');
}

// Initialize Stripe and Supabase clients
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16'
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({
        error: 'No signature provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    let event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({
        error: `Invalid signature: ${err.message}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleCheckoutSessionCompleted(session) {
  console.log('Processing checkout session completed for session:', session.id);
  
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.error('No order_id found in session metadata');
    return;
  }

  try {
    // Fetch order with service role to bypass RLS
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('Error fetching order:', fetchError);
      return;
    }

    // Get payment intent from session
    const paymentIntentId = session.payment_intent;
    if (!paymentIntentId) {
      console.error('No payment intent found in session');
      return;
    }

    // Calculate payment amount in dollars
    const paidAmount = session.amount_total / 100;

    // Update payment intent IDs array
    let updatedPaymentIntents = order.payment_intent_id || [];
    if (!updatedPaymentIntents.includes(paymentIntentId)) {
      updatedPaymentIntents = [...updatedPaymentIntents, paymentIntentId];
    }

    // Update order - set status to PAID and outstanding_amount to 0
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_intent_id: updatedPaymentIntents,
        outstanding_amount: 0, // Set to 0 as requested
        status: 'PAID', // Set status to PAID as requested
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return;
    }

    // Add success message to chat
    try {
      await supabase
        .from('messages')
        .insert({
          order_id: orderId,
          sender_id: order.user_id,
          message_text: `Payment of $${paidAmount.toFixed(2)} received successfully. Order is now being processed.`
        });
    } catch (messageError) {
      console.error('Error adding payment message to chat:', messageError);
    }

    console.log(`Successfully processed payment for order ${orderId}:
      Amount: $${paidAmount}
      Status: PAID
      Outstanding Amount: 0`);

  } catch (error) {
    console.error('Error processing checkout session completion:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Processing payment intent succeeded for payment intent:', paymentIntent.id);
  
  const orderId = paymentIntent.metadata?.order_id;
  if (!orderId) {
    console.error('No order_id found in payment intent metadata');
    return;
  }

  try {
    // Fetch order with service role to bypass RLS
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('Error fetching order:', fetchError);
      return;
    }

    // Get payment intent from payment intent
    const paymentIntentId = paymentIntent.id;
    if (!paymentIntentId) {
      console.error('No payment intent found in payment intent');
      return;
    }

    // Calculate payment amount in dollars
    const paidAmount = paymentIntent.amount / 100;

    // Update payment intent IDs array
    let updatedPaymentIntents = order.payment_intent_id || [];
    if (!updatedPaymentIntents.includes(paymentIntentId)) {
      updatedPaymentIntents = [...updatedPaymentIntents, paymentIntentId];
    }

    // Update order - set status to PAID and outstanding_amount to 0
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_intent_id: updatedPaymentIntents,
        outstanding_amount: 0, // Set to 0 as requested
        status: 'PAID', // Set status to PAID as requested
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return;
    }

    // Add success message to chat
    try {
      await supabase
        .from('messages')
        .insert({
          order_id: orderId,
          sender_id: order.user_id,
          message_text: `Payment of $${paidAmount.toFixed(2)} received successfully. Order is now being processed.`
        });
    } catch (messageError) {
      console.error('Error adding payment message to chat:', messageError);
    }

    console.log(`Successfully processed payment for order ${orderId}:
      Amount: $${paidAmount}
      Status: PAID
      Outstanding Amount: 0`);

  } catch (error) {
    console.error('Error processing payment intent completion:', error);
  }
}

async function handleRefund(charge) {
  console.log('Processing refund for charge:', charge.id);
  
  try {
    // Get the payment intent from the charge
    const paymentIntentId = charge.payment_intent;
    if (!paymentIntentId) {
      console.error('No payment intent found in charge');
      return;
    }

    // Find the order that contains this payment intent
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .contains('payment_intent_id', [paymentIntentId]);

    if (fetchError || !orders || orders.length === 0) {
      console.error('No order found with payment intent:', paymentIntentId);
      return;
    }

    const order = orders[0];
    const refundAmount = charge.amount_refunded / 100;

    // Update the payment_intent_id array to include the refund ID
    let updatedPaymentIntents = Array.isArray(order.payment_intent_id) 
      ? [...order.payment_intent_id] 
      : [order.payment_intent_id];
    
    if (!updatedPaymentIntents.includes(charge.id)) {
      updatedPaymentIntents.push(charge.id);
      
      // Update the order with the new refund ID
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_intent_id: updatedPaymentIntents,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order with refund ID:', updateError);
        return;
      }
    }

    // Send a message in the chat about the refund
    try {
      await supabase
        .from('messages')
        .insert({
          order_id: order.id,
          sender_id: order.user_id,
          message_text: `A refund of $${refundAmount.toFixed(2)} has been processed for this order. Refund ID: ${charge.id}`
        });
    } catch (messageError) {
      console.error('Error sending refund message to chat:', messageError);
    }

    console.log(`Successfully processed refund for order ${order.id}:
      Refund Amount: $${refundAmount}
      Refund ID: ${charge.id}`);

  } catch (error) {
    console.error('Error processing refund:', error);
  }
}
