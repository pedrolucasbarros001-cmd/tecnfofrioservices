import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);

    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is dono
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', claimsData.user.id)
      .single();

    if (callerRole?.role !== 'dono') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem alterar níveis de acesso' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, new_role, specialization } = await req.json();

    if (!user_id || !new_role) {
      return new Response(
        JSON.stringify({ error: 'user_id e new_role são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['dono', 'secretaria', 'tecnico', 'monitor'];
    if (!validRoles.includes(new_role)) {
      return new Response(
        JSON.stringify({ error: 'Nível de acesso inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Delete all existing roles
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error deleting roles:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao remover role anterior: ' + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Insert new role
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id, role: new_role });

    if (insertError) {
      console.error('Error inserting role:', insertError);
      // Try to recover by re-inserting - critical failure
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir novo nível de acesso: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Handle technician record
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (profile) {
      const { data: existingTech } = await supabaseAdmin
        .from('technicians')
        .select('id, active')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (new_role === 'tecnico') {
        if (existingTech) {
          // Reactivate if inactive
          if (!existingTech.active) {
            await supabaseAdmin
              .from('technicians')
              .update({ active: true, specialization: specialization || null })
              .eq('id', existingTech.id);
          } else if (specialization !== undefined) {
            await supabaseAdmin
              .from('technicians')
              .update({ specialization: specialization || null })
              .eq('id', existingTech.id);
          }
        } else {
          // Create new technician record
          await supabaseAdmin
            .from('technicians')
            .insert({
              profile_id: profile.id,
              specialization: specialization || null,
              active: true,
            });
        }
      } else if (existingTech && existingTech.active) {
        // Deactivate technician
        await supabaseAdmin
          .from('technicians')
          .update({ active: false })
          .eq('id', existingTech.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Nível de acesso atualizado com sucesso' }),
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
