import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

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
    const { order_id, success_url, cancel_url } = await req.json();
    
    // Validate required fields
    if (!order_id) {
      return new Response(JSON.stringify({
        error: 'Missing required field: order_id'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch order with full details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, 
        status, 
        user_id, 
        outstanding_amount,
        projectname,
        quantity,
        name,
        address,
        cushions_count
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({
        error: 'Order not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate order status
    if (order.status !== 'UNPAID') {
      return new Response(JSON.stringify({
        error: `Order is not in UNPAID status. Current status: ${order.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate outstanding amount
    const outstandingAmount = order.outstanding_amount || 0;
    if (outstandingAmount <= 0) {
      return new Response(JSON.stringify({
        error: 'Order has no outstanding amount to pay'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Order #${order.id}`,
              description: `Custom boat cushion order - ${order.cushions_count || order.quantity} cushions`,
            },
            unit_amount: Math.round(outstandingAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url || `${req.headers.get('origin')}/orders/${order_id}?success=true`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/orders/${order_id}?canceled=true`,
      metadata: {
        order_id: order_id.toString(),
        user_id: order.user_id,
        outstanding_amount: outstandingAmount.toString(),
        project_name: order.projectname || '',
        customer_name: order.name
      },
      customer_creation: 'always',
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true
      },
      payment_intent_data: {
        metadata: {
          order_id: order_id.toString(),
          user_id: order.user_id,
          outstanding_amount: outstandingAmount.toString(),
          project_name: order.projectname || '',
          customer_name: order.name
        },
        description: `Payment for Order #${order.id}`
      }
    });

    return new Response(JSON.stringify({
      session_id: session.id,
      url: session.url,
      order_id: order_id,
      amount: outstandingAmount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create checkout session'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
