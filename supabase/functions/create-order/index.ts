import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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
    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    
    const {
      projectname,
      quantity,
      color,
      name,
      contact_name,
      address,
      address2,
      country,
      zipcode,
      state,
      company_phone,
      phonenumber,
      email,
      ship_by_date,
      boat_make,
      boat_model,
      boat_year,
      boat_length,
      boat_HIN,
      cushions_count,
      color_images,
      cushions
    } = requestBody;

    // Validate required fields
    if (!name || !address || !zipcode || !state || !phonenumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: name, address, zipcode, state, phonenumber' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        projectname: projectname || null,
        quantity: quantity || 0,
        color: color || [],
        name,
        contact_name: contact_name || null,
        address,
        address2: address2 || null,
        country: country || null,
        zipcode,
        state,
        company_phone: company_phone || null,
        phonenumber,
        email: email || null,
        ship_by_date: ship_by_date || null,
        boat_make: boat_make || null,
        boat_model: boat_model || null,
        boat_year: boat_year || null,
        boat_length: boat_length || null,
        boat_HIN: boat_HIN || null,
        status: 'UNPAID',
        payment_intent_id: [],
        cushions_count: cushions_count || 0,
        color_images: color_images || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create order: ${orderError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create cushions if provided
    if (cushions && Array.isArray(cushions) && cushions.length > 0) {
      const cushionRecords = cushions.map((cushion: any) => ({
        order_id: order.id,
        name: cushion.name,
        quantity: cushion.quantity,
        mirror: cushion.mirror || false,
        videos: cushion.videos || []
      }));

      const { error: cushionError } = await supabase
        .from('cushions')
        .insert(cushionRecords);

      if (cushionError) {
        console.error('Error creating cushions:', cushionError);
        // Don't fail the entire request if cushions fail to insert
        // The order was created successfully
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { order }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});