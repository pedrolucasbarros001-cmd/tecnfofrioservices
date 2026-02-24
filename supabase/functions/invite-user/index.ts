import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  password: string;
  role: 'dono' | 'secretaria' | 'tecnico' | 'monitor';
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
        JSON.stringify({ error: 'Apenas administradores podem criar utilizadores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, full_name, password, role, phone, specialization } = body;

    // Validate required fields
    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, nome e nível de acesso são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Palavra-passe é obrigatória e deve ter pelo menos 8 caracteres' }),
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

    // Create user with the provided password
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar utilizador: ' + createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUser = createData.user;

    if (!newUser) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar utilizador' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Wait for the trigger to create the profile, with retries
    let profileExists = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: profileCheck } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', newUser.id)
        .maybeSingle();
      if (profileCheck) {
        profileExists = true;
        break;
      }
    }

    // If profile still doesn't exist after retries, create it manually
    if (!profileExists) {
      console.log('Profile not created by trigger, creating manually');
      const { error: manualProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.id,
          email: email,
          full_name: full_name,
          phone: phone || null,
        });
      if (manualProfileError) {
        console.error('Error creating profile manually:', manualProfileError);
        return new Response(
          JSON.stringify({ 
            error: 'Utilizador criado mas houve erro ao criar o perfil. Contacte o suporte.',
            user_id: newUser.id,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (phone) {
      // Update profile with phone if trigger created it
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
      return new Response(
        JSON.stringify({ 
          error: 'Utilizador criado mas houve erro ao atribuir o nível de acesso: ' + roleInsertError.message,
          user_id: newUser.id,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If technician, create technician record
    if (role === 'tecnico') {
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
        }
      }
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Utilizador criado com sucesso',
        user_id: newUser.id,
        email: email,
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
