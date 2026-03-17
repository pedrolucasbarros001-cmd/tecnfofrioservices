import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("!!! EDGE FUNCTION BOOTING !!!");

Deno.serve(async (req) => {
  const { method } = req;
  console.log(`[Request] ${method} ${req.url}`);

  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_KAY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RESEND_API_KEY) throw new Error("RESEND_KAY secret not set");

    const body = await req.json();
    const { service_id, action_type, custom_message } = body;
    console.log(`[Payload]`, { service_id, action_type });

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*, customer:customers(*), technician:profiles!services_technician_id_fkey(*)')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) throw new Error("Service not found");

    const customerEmail = service.contact_email || service.customer?.email;
    if (!customerEmail) throw new Error("No receiver email");

    let subject = "";
    let htmlContent = "";

    if (action_type === 'visit_report') {
      subject = `Relatório de Intervenção - ${service.code}`;
      htmlContent = await generateVisitReportTemplate(supabase, service);
    } else if (action_type === 'payment_reminder') {
      subject = `Lembrete de Pagamento - ${service.code}`;
      htmlContent = generatePaymentReminderTemplate(service);
    } else if (action_type === 'part_notice') {
      subject = `Aviso de Equipamento em Espera de Peça - ${service.code}`;
      htmlContent = generatePartNoticeTemplate(service);
    } else if (action_type === 'custom_message') {
      subject = `Informação sobre o Serviço - ${service.code}`;
      htmlContent = generateCustomMessageTemplate(service, custom_message);
    }

    console.log(`[Resend] Sending to ${customerEmail}`);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Tecnofrio Services <geral@tecnofrioservices.com>',
        to: [customerEmail],
        subject: subject,
        html: htmlContent,
      })
    });

    const resData = await res.json();
    console.log(`[Resend Response]`, resData);

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error(`[Error]`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
})

// TEMPLATES (Safer Versions)
async function generateVisitReportTemplate(supabase: any, service: any) {
  const { data: parts } = await supabase.from('service_parts').select('*').eq('service_id', service.id).eq('is_requested', false);
  const { data: photos } = await supabase.from('service_photos').select('*').eq('service_id', service.id);
  const { data: docs } = await supabase.from('service_documents').select('*').eq('service_id', service.id);

  const partsList = (parts || []).map((p: any) => `<li>${p.part_name} - ${p.quantity}</li>`).join('');
  const photoList = (photos || []).slice(0, 4).map((p: any) => `<img src="${p.file_url}" style="width:200px; margin:5px;"/>`).join('');
  const docList = (docs || []).map((d: any) => `<li><a href="${d.file_url}">${d.file_name}</a></li>`).join('');

  return `
    <div style="font-family: sans-serif;">
      <h1>Relatório de Intervenção</h1>
      <p>Serviço #${service.code}</p>
      <p>Olá ${service.customer?.name}, o seu serviço foi concluído.</p>
      ${service.work_performed ? `<p><strong>Trabalho:</strong> ${service.work_performed}</p>` : ''}
      ${partsList ? `<ul>${partsList}</ul>` : ''}
      ${photoList ? `<div>${photoList}</div>` : ''}
      ${docList ? `<ul>${docList}</ul>` : ''}
    </div>`;
}

function generatePaymentReminderTemplate(service: any) {
  const balance = ((service.final_price || 0) - (service.amount_paid || 0)).toFixed(2);
  return `<h1>Lembrete de Pagamento</h1><p>Valor Pendente: ${balance}€</p>`;
}

function generatePartNoticeTemplate(service: any) {
  return `<h1>Aguardar Peças</h1><p>Equipamento: ${service.brand}</p>`;
}

function generateCustomMessageTemplate(service: any, message: string) {
  return `<h1>Informação</h1><p>${message}</p>`;
}
