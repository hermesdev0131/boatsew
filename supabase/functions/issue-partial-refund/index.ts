import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@13.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16'
});

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, refund_amount } = await req.json();
    
    if (!order_id || !refund_amount) {
      return new Response(JSON.stringify({
        error: 'Missing order_id or refund_amount'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch order and payment_intent_id
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, payment_intent_id, user_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order || !order.payment_intent_id) {
      return new Response(JSON.stringify({
        error: 'Order or payment intent not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use the oldest payment intent if payment_intent_id is an array
    const paymentIntentId = Array.isArray(order.payment_intent_id) 
      ? order.payment_intent_id[0] 
      : order.payment_intent_id;

    // Issue refund via Stripe (do NOT update outstanding_amount)
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(Math.abs(refund_amount) * 100),
      reason: 'requested_by_customer'
    });

    // Get the user who initiated the request from the JWT, if available
    let sender_id = order.user_id;
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.replace('Bearer ', '');
        // Decode JWT to get sub (user id)
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        if (payload.sub) sender_id = payload.sub;
      }
    } catch (e) {
      // Fallback to order.user_id if anything fails
    }

    // Add the refund id to the payment_intent_id array if not already present
    let updatedPaymentIntents = Array.isArray(order.payment_intent_id) 
      ? [...order.payment_intent_id] 
      : [order.payment_intent_id];
    
    if (!updatedPaymentIntents.includes(refund.id)) {
      updatedPaymentIntents.push(refund.id);
      await supabase
        .from('orders')
        .update({ payment_intent_id: updatedPaymentIntents })
        .eq('id', order.id);
    }

    // Send a message in the chat
    await supabase
      .from('messages')
      .insert({
        order_id: order.id,
        sender_id: sender_id,
        message_text: `A partial refund of $${Math.abs(refund_amount).toFixed(2)} has been issued for this order.`
      });

    return new Response(JSON.stringify({
      success: true,
      refund_id: refund.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
