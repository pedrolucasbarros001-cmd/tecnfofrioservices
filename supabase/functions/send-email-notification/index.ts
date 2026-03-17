import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("!!! EDGE FUNCTION BOOTING (PRO MAX v1.2) !!!");

Deno.serve(async (req) => {
  const { method } = req;
  
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log(`[Request Body]`, JSON.stringify(body));

    // Handle both direct calls AND Supabase Webhooks
    let service_id = body.service_id;
    let action_type = body.action_type;
    let custom_message = body.custom_message;

    // Detect Supabase Webhook Structure
    if (!service_id && body.record) {
      console.log("[Detection] Supabase Webhook detected");
      service_id = body.record.id;
      
      const old = body.old_record || {};
      const record = body.record;

      // Determine action based on updated timestamps (matches migration logic)
      if (old.last_visit_report_sent_at !== record.last_visit_report_sent_at) {
        action_type = 'visit_report';
      } else if (old.last_payment_reminder_sent_at !== record.last_payment_reminder_sent_at) {
        action_type = 'payment_reminder';
      } else if (old.last_part_notice_sent_at !== record.last_part_notice_sent_at) {
        action_type = 'part_notice';
      }
    }

    if (!service_id || !action_type) {
      console.error("[Error] Missing service_id or action_type after parsing");
      return new Response(JSON.stringify({ error: "Dados incompletos (service_id/action_type)" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_KAY') || Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RESEND_API_KEY) throw new Error("RESEND_KAY não configurada");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch Full Service Detail
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        customer:customers(*),
        technician:profiles!services_technician_id_fkey(*)
      `)
      .eq('id', service_id)
      .single();

    if (serviceError || !service) throw new Error(`Serviço ${service_id} não encontrado`);

    const customerEmail = service.contact_email || service.customer?.email;
    if (!customerEmail) {
      console.warn(`[Skip] No email for service ${service.code}`);
      return new Response(JSON.stringify({ success: false, message: "Cliente sem email" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    let subject = "";
    let htmlContent = "";

    // Template Mapping
    if (action_type === 'visit_report') {
      subject = `Relatório de Intervenção - ${service.code}`;
      htmlContent = await generateVisitReportTemplate(supabase, service);
    } else if (action_type === 'payment_reminder') {
      subject = `Lembrete de Pagamento - ${service.code}`;
      htmlContent = generatePaymentReminderTemplate(service);
    } else if (action_type === 'part_notice') {
      subject = `Atualização de Serviço (Aguardar Peças) - ${service.code}`;
      htmlContent = generatePartNoticeTemplate(service);
    } else if (action_type === 'custom_message') {
      subject = `Informação sobre o Serviço - ${service.code}`;
      htmlContent = generateCustomMessageTemplate(service, custom_message);
    }

    console.log(`[Resend] Sending ${action_type} to ${customerEmail}`);
    
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
    console.log(`[Resend OK]`, resData);

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error(`[Fatal Error]`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})

// PREMIUM TEMPLATES
async function generateVisitReportTemplate(supabase: any, service: any) {
  const [partsRes, photosRes, docsRes] = await Promise.all([
    supabase.from('service_parts').select('*').eq('service_id', service.id).eq('is_requested', false),
    supabase.from('service_photos').select('*').eq('service_id', service.id),
    supabase.from('service_documents').select('*').eq('service_id', service.id)
  ]);

  const parts = partsRes.data || [];
  const photos = photosRes.data || [];
  const docs = docsRes.data || [];

  const partsHtml = parts.map((p: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${p.part_name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #edf2f7; text-align: center;">${p.quantity}</td>
    </tr>`).join('');

  const photosHtml = photos.slice(0, 4).map((p: any) => `
    <div style="display: inline-block; width: 48%; margin-bottom: 10px; padding: 2px;">
      <img src="${p.file_url}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />
    </div>`).join('');

  const docsHtml = docs.map((d: any) => `
    <li style="margin-bottom: 5px;"><a href="${d.file_url}" style="color: #3182ce; text-decoration: none;">📎 ${d.file_name}</a></li>`).join('');

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #1a202c; color: white; padding: 40px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.5px;">Relatório de Intervenção</h1>
        <p style="margin: 8px 0 0; opacity: 0.7; font-size: 14px;">Processo #${service.code}</p>
      </div>
      <div style="padding: 32px 24px; color: #2d3748;">
        <p style="font-size: 16px;">Caro(a) <strong>${service.contact_name || service.customer?.name}</strong>,</p>
        <p style="color: #4a5568; line-height: 1.6;">Informamos que a assistência técnica ao seu equipamento foi concluída com sucesso. Veja os detalhes abaixo:</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #edf2f7;">
          <p style="margin: 0; font-size: 18px; color: #1a202c; font-weight: 700;">${service.appliance_type} ${service.brand} ${service.model}</p>
          ${service.serial_number ? `<p style="margin: 4px 0 0; font-size: 12px; color: #718096;">S/N: ${service.serial_number}</p>` : ''}
        </div>

        ${service.work_performed ? `
          <div style="margin-top: 24px;">
            <p style="font-weight: 800; color: #2b6cb0; text-transform: uppercase; font-size: 11px; margin-bottom: 8px;">Serviço Efetuado</p>
            <div style="background: #ebf8ff; padding: 16px; border-left: 4px solid #3182ce; border-radius: 4px;">
              <p style="margin: 0; line-height: 1.5; font-size: 14px; white-space: pre-wrap;">${service.work_performed}</p>
            </div>
          </div>` : ''}

        ${parts.length > 0 ? `
          <div style="margin-top: 32px;">
            <p style="font-weight: 800; color: #2d3748; text-transform: uppercase; font-size: 11px; margin-bottom: 12px;">Artigos Utilizados</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="background: #f8fafc; color: #718096;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #edf2f7;">Peça</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #edf2f7; width: 60px;">Qtd</th>
              </tr>
              ${partsHtml}
            </table>
          </div>` : ''}

        ${photos.length > 0 ? `<div style="margin-top: 32px;">${photosHtml}</div>` : ''}
        ${docs.length > 0 ? `<div style="margin-top: 32px; padding: 20px; background: #f7fafc; border-radius: 8px;">
            <p style="font-weight: 800; color: #2d3748; text-transform: uppercase; font-size: 11px; margin-bottom: 12px;">Documentação</p>
            <ul style="padding: 0; margin: 0; list-style: none; font-size: 14px;">${docsHtml}</ul>
        </div>` : ''}

        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #edf2f7; text-align: center;">
           <p style="margin: 0; color: #718096; font-size: 13px;">Técnico Responsável: <strong>${service.technician?.full_name || 'Equipa Tecnofrio'}</strong></p>
        </div>
      </div>
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #edf2f7; color: #a0aec0; font-size: 11px;">
        Este é um email automático de Tecnofrio Services. Por favor não responda diretamente.
      </div>
    </div>`;
}

function generatePaymentReminderTemplate(service: any) {
  const balance = ((service.final_price || 0) - (service.amount_paid || 0)).toFixed(2);
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; overflow: hidden;">
      <div style="background: #ef4444; color: white; padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Aviso de Valor Pendente</h1>
        <p style="margin: 8px 0 0; opacity: 0.8;">Serviço #${service.code}</p>
      </div>
      <div style="padding: 32px 24px; color: #1f2937;">
        <p>Olá <strong>${service.contact_name || service.customer?.name}</strong>,</p>
        <p>Lembramos que existe o seguinte montante em aberto relativo à intervenção no seu equipamento:</p>
        <div style="background: #fef2f2; padding: 32px; border-radius: 12px; text-align: center; margin: 24px 0; border: 2px dashed #fecaca;">
          <h2 style="margin: 0; font-size: 40px; color: #ef4444;">${balance}€</h2>
        </div>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px;"><strong>Dados de Pagamento:</strong></p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #4b5563;">PF confirme no ato da receção ou contacte-nos para dados de transferência/MBWay.</p>
        </div>
        <p style="margin-top: 32px; font-size: 13px; color: #6b7280; text-align: center;">Agradecemos a sua preferência.</p>
      </div>
    </div>`;
}

function generatePartNoticeTemplate(service: any) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fde68a; border-radius: 12px; overflow: hidden;">
      <div style="background: #f59e0b; color: white; padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Atualização de Serviço</h1>
        <p style="margin: 8px 0 0; opacity: 0.8;">Processo #${service.code}</p>
      </div>
      <div style="padding: 32px 24px; color: #1f2937;">
        <p>Olá <strong>${service.contact_name || service.customer?.name}</strong>,</p>
        <p>Informamos que a reparação do seu equipamento (<strong>${service.appliance_type} ${service.brand}</strong>) está a <strong>aguardar a receção de peças específicas</strong> encomendadas ao fabricante.</p>
        <p style="color: #4b5563; line-height: 1.6;">O seu equipamento encontra-se seguro na nossa oficina e retomaremos o trabalho assim que o material chegar. Entraremos em contacto para agendar a entrega/conclusão.</p>
        <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">Obrigado pela sua compreensão.</p>
      </div>
    </div>`;
}

function generateCustomMessageTemplate(service: any, message: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background: #2563eb; color: white; padding: 40px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Informação Tecnofrio</h1>
        <p style="margin: 8px 0 0; opacity: 0.8;">Assunto: Serviço #${service.code}</p>
      </div>
      <div style="padding: 32px 24px; color: #111827;">
        <p style="font-size: 16px;">Caro(a) <strong>${service.contact_name || service.customer?.name}</strong>,</p>
        <div style="margin: 24px 0; font-size: 16px; line-height: 1.8; color: #374151; white-space: pre-wrap;">${message || 'Temos uma atualização sobre o seu processo em curso.'}</div>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: bold;">Equipamento</p>
          <p style="margin: 4px 0 0; font-size: 15px; color: #4b5563;">${service.appliance_type} ${service.brand} ${service.model}</p>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
        Tecnofrio Services - Assistência Técnica 24h
      </div>
    </div>`;
}
