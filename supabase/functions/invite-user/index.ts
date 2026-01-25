import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  email: string;
  full_name: string;
  role: 'dono' | 'secretaria' | 'tecnico';
  phone?: string;
  specialization?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is authenticated and is a 'dono'
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);

    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is 'dono'
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', claimsData.user.id)
      .single();

    if (roleError || callerRole?.role !== 'dono') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem convidar utilizadores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: InviteUserRequest = await req.json();
    const { email, full_name, role, phone, specialization } = body;

    // Validate required fields
    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, nome e nível de acesso são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Este email já está registado no sistema' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invite user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          phone,
          role,
        },
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar convite: ' + inviteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUser = inviteData.user;

    if (!newUser) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar utilizador' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The profile should be created automatically by the trigger
    // But we need to update it with additional data and create the role

    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with phone
    if (phone) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('user_id', newUser.id);
    }

    // Create user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.id,
        role,
      });

    if (roleInsertError) {
      console.error('Error creating user role:', roleInsertError);
      // Don't fail the whole operation, the user was created
    }

    // If technician, create technician record
    if (role === 'tecnico') {
      // Get the profile ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', newUser.id)
        .single();

      if (profile) {
        const { error: techError } = await supabaseAdmin
          .from('technicians')
          .insert({
            profile_id: profile.id,
            specialization: specialization || null,
            active: true,
          });

        if (techError) {
          console.error('Error creating technician:', techError);
          // Don't fail the whole operation
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Convite enviado para ${email}`,
        user_id: newUser.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
