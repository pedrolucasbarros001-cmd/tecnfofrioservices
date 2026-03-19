import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Company info (duplicated from frontend for edge function context)
const COMPANY = {
  name: 'TECNOFRIO',
  address: 'R. Dom Pedro IV 3 R/C, Bairro da Coxa',
  postalCode: '5300-124',
  city: 'Bragança',
  phone: '273 332 772',
  email: 'tecno.frio@sapo.pt',
}

const LOGO_URL = 'https://flialeqlwrtfnonxtsnx.supabase.co/storage/v1/object/public/service-photos/tecnofrio-logo.png'

// Colors
const BLUE = '#1a365d'
const BLUE_LIGHT = '#2B4F84'
const RED = '#c53030'
const AMBER = '#b7791f'
const GRAY_BG = '#f7fafc'
const GRAY_BORDER = '#e2e8f0'
const TEXT_DARK = '#1a202c'
const TEXT_MED = '#4a5568'
const TEXT_LIGHT = '#718096'

console.log("!!! EDGE FUNCTION BOOTING !!!");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log(`[Request Body]`, JSON.stringify(body));

    let service_id = body.service_id;
    let action_type = body.action_type;
    let custom_message = body.custom_message;

    // Detect Supabase Webhook Structure
    if (!service_id && body.record) {
      service_id = body.record.id;
      const old = body.old_record || {};
      const record = body.record;
      if (old.last_visit_report_sent_at !== record.last_visit_report_sent_at) action_type = 'visit_report';
      else if (old.last_payment_reminder_sent_at !== record.last_payment_reminder_sent_at) action_type = 'payment_reminder';
      else if (old.last_part_notice_sent_at !== record.last_part_notice_sent_at) action_type = 'part_notice';
    }

    if (!service_id || !action_type) {
      return new Response(JSON.stringify({ error: "Dados incompletos (service_id/action_type)" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_KAY') || Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RESEND_API_KEY) throw new Error("RESEND API KEY não configurada");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fixed query: services → technicians → profiles
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*, customer:customers(*), tech:technicians(*, profile:profiles(*))')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      console.error(`[Error] Service not found:`, serviceError?.message);
      throw new Error(`Serviço ${service_id} não encontrado: ${serviceError?.message}`);
    }

    const customerEmail = service.contact_email || service.customer?.email;
    if (!customerEmail) {
      return new Response(JSON.stringify({ success: false, message: "Cliente sem email" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }

    const techName = service.tech?.profile?.full_name || 'Equipa Tecnofrio';
    let subject = "";
    let htmlContent = "";

    if (action_type === 'visit_report') {
      subject = `Relatório de Intervenção - ${service.code}`;
      htmlContent = await generateVisitReportTemplate(supabase, service, techName);
    } else if (action_type === 'payment_reminder') {
      subject = `Aviso de Valor Pendente - ${service.code}`;
      htmlContent = generatePaymentReminderTemplate(service);
    } else if (action_type === 'part_notice') {
      subject = `Atualização de Serviço - ${service.code}`;
      htmlContent = generatePartNoticeTemplate(service);
    } else if (action_type === 'custom_message') {
      subject = `Informação sobre o Serviço - ${service.code}`;
      htmlContent = generateCustomMessageTemplate(service, custom_message);
    }

    console.log(`[Resend] Sending ${action_type} to ${customerEmail}`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Tecnofrio Services <geral@tecnofrioservices.com>',
        to: [customerEmail],
        subject,
        html: htmlContent,
      })
    });

    const resData = await res.json();
    console.log(`[Resend Response]`, resData);

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error: any) {
    console.error(`[Fatal Error]`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
})

// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

function emailWrapper(headerBg: string, headerContent: string, bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf2f7;">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <!-- HEADER -->
  <tr><td style="background:${headerBg};padding:0;">
    ${headerContent}
  </td></tr>
  <!-- BODY -->
  <tr><td style="padding:32px 28px;color:${TEXT_DARK};">
    ${bodyContent}
  </td></tr>
  <!-- FOOTER -->
  <tr><td style="background:${GRAY_BG};padding:24px 28px;border-top:1px solid ${GRAY_BORDER};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${TEXT_DARK};">${COMPANY.name}</p>
        <p style="margin:0 0 2px;font-size:11px;color:${TEXT_LIGHT};">${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}</p>
        <p style="margin:0 0 2px;font-size:11px;color:${TEXT_LIGHT};">Tel: ${COMPANY.phone} | ${COMPANY.email}</p>
        <p style="margin:8px 0 0;font-size:10px;color:#a0aec0;">Este é um email automático. Por favor não responda diretamente.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function headerWithLogo(bg: string, title: string, subtitle: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:28px 28px 12px;">
        <img src="${LOGO_URL}" alt="Tecnofrio" height="40" style="height:40px;display:block;" />
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 24px;">
        <h1 style="margin:0;font-size:22px;color:#ffffff;letter-spacing:-0.3px;">${title}</h1>
        ${subtitle ? `<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">${subtitle}</p>` : ''}
      </td>
    </tr>
  </table>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 12px;font-size:11px;text-transform:uppercase;font-weight:700;color:${TEXT_LIGHT};width:120px;vertical-align:top;">${label}</td>
    <td style="padding:6px 12px;font-size:14px;color:${TEXT_DARK};">${value || '—'}</td>
  </tr>`;
}

function sectionTitle(text: string) {
  return `<p style="margin:28px 0 10px;font-size:11px;font-weight:800;text-transform:uppercase;color:${BLUE_LIGHT};letter-spacing:0.5px;">${text}</p>`;
}

function customerName(service: any) {
  return service.contact_name || service.customer?.name || 'Cliente';
}

function formatDate(d?: string) {
  if (!d) return new Date().toLocaleDateString('pt-PT');
  return new Date(d).toLocaleDateString('pt-PT');
}

function formatCurrency(v: number) {
  return v.toFixed(2).replace('.', ',') + '€';
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 1: RELATÓRIO DE INTERVENÇÃO
// ═══════════════════════════════════════════════════════════════

async function generateVisitReportTemplate(supabase: any, service: any, techName: string) {
  const [partsRes, photosRes, docsRes] = await Promise.all([
    supabase.from('service_parts').select('*').eq('service_id', service.id).eq('is_requested', false),
    supabase.from('service_photos').select('*').eq('service_id', service.id),
    supabase.from('service_documents').select('*').eq('service_id', service.id)
  ]);

  const parts = partsRes.data || [];
  const photos = photosRes.data || [];
  const docs = docsRes.data || [];

  const header = headerWithLogo(BLUE, 'Relatório de Intervenção', `Processo ${service.code} · ${formatDate()}`);

  // Summary section
  const address = [service.service_address, service.service_city].filter(Boolean).join(', ') || service.customer?.address || '—';

  const summaryHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GRAY_BG};border-radius:8px;border:1px solid ${GRAY_BORDER};margin-bottom:24px;">
      <tr><td style="padding:16px 12px 4px;font-size:11px;font-weight:800;text-transform:uppercase;color:${BLUE_LIGHT};letter-spacing:0.5px;" colspan="2">Resumo da Intervenção</td></tr>
      ${infoRow('ID', service.code)}
      ${infoRow('Cliente', customerName(service))}
      ${infoRow('Localização', address)}
      ${infoRow('Data', formatDate(service.updated_at))}
    </table>`;

  // Equipment grid
  const equipmentHtml = `
    ${sectionTitle('Detalhes do Equipamento')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY_BORDER};border-radius:8px;overflow:hidden;">
      <tr>
        <td width="50%" style="padding:12px;border-bottom:1px solid ${GRAY_BORDER};border-right:1px solid ${GRAY_BORDER};">
          <p style="margin:0;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Tipo</p>
          <p style="margin:2px 0 0;font-size:14px;color:${TEXT_DARK};">${service.appliance_type || '—'}</p>
        </td>
        <td width="50%" style="padding:12px;border-bottom:1px solid ${GRAY_BORDER};">
          <p style="margin:0;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Marca</p>
          <p style="margin:2px 0 0;font-size:14px;color:${TEXT_DARK};">${service.brand || '—'}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid ${GRAY_BORDER};border-right:1px solid ${GRAY_BORDER};">
          <p style="margin:0;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Modelo</p>
          <p style="margin:2px 0 0;font-size:14px;color:${TEXT_DARK};">${service.model || '—'}</p>
        </td>
        <td style="padding:12px;border-bottom:1px solid ${GRAY_BORDER};">
          <p style="margin:0;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Nº Série</p>
          <p style="margin:2px 0 0;font-size:14px;color:${TEXT_DARK};">${service.serial_number || '—'}</p>
        </td>
      </tr>
      ${service.pnc ? `<tr><td colspan="2" style="padding:12px;">
        <p style="margin:0;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">PNC</p>
        <p style="margin:2px 0 0;font-size:14px;color:${TEXT_DARK};">${service.pnc}</p>
      </td></tr>` : ''}
    </table>`;

  // Work performed
  const workHtml = service.work_performed ? `
    ${sectionTitle('Trabalho Realizado')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-left:4px solid ${BLUE_LIGHT};background:#ebf8ff;padding:16px;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT_DARK};white-space:pre-wrap;">${service.work_performed}</p>
        </td>
      </tr>
    </table>` : '';

  // Detected fault
  const faultHtml = service.detected_fault ? `
    ${sectionTitle('Avaria Detetada')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${GRAY_BG};padding:12px 16px;border-radius:8px;border:1px solid ${GRAY_BORDER};">
          <p style="margin:0;font-size:14px;color:${TEXT_MED};white-space:pre-wrap;">${service.detected_fault}</p>
        </td>
      </tr>
    </table>` : '';

  // Parts table
  let partsHtml = '';
  if (parts.length > 0) {
    let total = 0;
    const rows = parts.map((p: any) => {
      const qty = p.quantity || 1;
      const cost = p.cost || 0;
      const lineTotal = qty * cost;
      total += lineTotal;
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid ${GRAY_BORDER};font-size:12px;color:${TEXT_LIGHT};">${p.part_code || '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${GRAY_BORDER};font-size:13px;color:${TEXT_DARK};">${p.part_name}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${GRAY_BORDER};font-size:13px;color:${TEXT_DARK};text-align:center;">${qty}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${GRAY_BORDER};font-size:13px;color:${TEXT_DARK};text-align:right;">${formatCurrency(cost)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${GRAY_BORDER};font-size:13px;color:${TEXT_DARK};text-align:right;font-weight:600;">${formatCurrency(lineTotal)}</td>
      </tr>`;
    }).join('');

    partsHtml = `
      ${sectionTitle('Artigos Utilizados')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY_BORDER};border-radius:8px;overflow:hidden;">
        <tr style="background:${BLUE};">
          <th style="padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:#ffffff;font-weight:700;">Código</th>
          <th style="padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:#ffffff;font-weight:700;">Descrição</th>
          <th style="padding:10px;text-align:center;font-size:10px;text-transform:uppercase;color:#ffffff;font-weight:700;">Qtd</th>
          <th style="padding:10px;text-align:right;font-size:10px;text-transform:uppercase;color:#ffffff;font-weight:700;">Preço Unit.</th>
          <th style="padding:10px;text-align:right;font-size:10px;text-transform:uppercase;color:#ffffff;font-weight:700;">Total</th>
        </tr>
        ${rows}
        <tr style="background:${GRAY_BG};">
          <td colspan="4" style="padding:10px;font-size:13px;font-weight:700;color:${TEXT_DARK};text-align:right;">Total Artigos:</td>
          <td style="padding:10px;font-size:14px;font-weight:800;color:${BLUE};text-align:right;">${formatCurrency(total)}</td>
        </tr>
      </table>`;
  }

  // Photos grid (max 4)
  let photosHtml = '';
  if (photos.length > 0) {
    const photoItems = photos.slice(0, 4).map((p: any) => `
      <td width="50%" style="padding:4px;vertical-align:top;">
        <img src="${p.file_url}" alt="${p.description || 'Foto'}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;border:1px solid ${GRAY_BORDER};display:block;" />
        ${p.description ? `<p style="margin:4px 0 0;font-size:11px;color:${TEXT_LIGHT};text-align:center;">${p.description}</p>` : ''}
      </td>`);

    const rows = [];
    for (let i = 0; i < photoItems.length; i += 2) {
      rows.push(`<tr>${photoItems[i]}${photoItems[i + 1] || '<td></td>'}</tr>`);
    }

    photosHtml = `
      ${sectionTitle('Registo Fotográfico')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table>`;
  }

  // Documents
  let docsHtml = '';
  if (docs.length > 0) {
    const items = docs.map((d: any) => `
      <tr><td style="padding:6px 0;">
        <a href="${d.file_url}" style="color:${BLUE_LIGHT};text-decoration:none;font-size:13px;">📎 ${d.file_name}</a>
      </td></tr>`).join('');
    docsHtml = `
      ${sectionTitle('Documentação Anexa')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GRAY_BG};padding:12px;border-radius:8px;">${items}</table>`;
  }

  // Technician
  const techHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;padding-top:20px;border-top:2px solid ${GRAY_BORDER};">
      <tr><td align="center">
        <p style="margin:0;font-size:11px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Técnico Responsável</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${BLUE};">${techName}</p>
      </td></tr>
    </table>`;

  const greeting = `<p style="font-size:15px;color:${TEXT_DARK};">Caro(a) <strong>${customerName(service)}</strong>,</p>
    <p style="font-size:14px;color:${TEXT_MED};line-height:1.6;">Informamos que a assistência técnica ao seu equipamento foi concluída. Segue o relatório detalhado da intervenção realizada.</p>`;

  const body = greeting + summaryHtml + equipmentHtml + faultHtml + workHtml + partsHtml + photosHtml + docsHtml + techHtml;

  return emailWrapper(BLUE, header, body);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 2: LEMBRETE DE PAGAMENTO
// ═══════════════════════════════════════════════════════════════

function generatePaymentReminderTemplate(service: any) {
  const balance = ((service.final_price || 0) - (service.amount_paid || 0));

  const header = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 28px 8px;">
      <img src="${LOGO_URL}" alt="Tecnofrio" height="36" style="height:36px;" />
    </td></tr>
    <tr><td style="padding:16px 28px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${RED};border-radius:8px;">
        <tr><td align="center" style="padding:16px;">
          <h1 style="margin:0;font-size:20px;color:#ffffff;letter-spacing:0.5px;">⚠ AVISO DE VALOR PENDENTE</h1>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">Serviço ${service.code}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`;

  const body = `
    <p style="font-size:15px;">Caro(a) <strong>${customerName(service)}</strong>,</p>
    <p style="font-size:14px;color:${TEXT_MED};line-height:1.6;">Verificámos que o valor indicado abaixo, relativo à intervenção técnica no seu equipamento, ainda se encontra pendente de regularização.</p>

    <!-- Amount highlight -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:#fff5f5;border:2px dashed #feb2b2;border-radius:12px;min-width:240px;">
          <tr><td align="center" style="padding:24px 40px;">
            <p style="margin:0;font-size:12px;text-transform:uppercase;color:${RED};font-weight:700;">Valor Pendente</p>
            <p style="margin:8px 0 0;font-size:42px;font-weight:800;color:${RED};letter-spacing:-1px;">${formatCurrency(balance)}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- Equipment reference -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GRAY_BG};border:1px solid ${GRAY_BORDER};border-radius:8px;margin-bottom:20px;">
      ${infoRow('Equipamento', [service.appliance_type, service.brand, service.model].filter(Boolean).join(' '))}
      ${infoRow('Processo', service.code)}
      ${service.final_price ? infoRow('Valor Total', formatCurrency(service.final_price)) : ''}
      ${service.amount_paid ? infoRow('Já Pago', formatCurrency(service.amount_paid)) : ''}
    </table>

    <!-- Payment info -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffff0;border:1px solid #fefcbf;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:${AMBER};">Dados de Pagamento</p>
        <p style="margin:0;font-size:13px;color:${TEXT_MED};line-height:1.6;">Poderá efetuar o pagamento no ato da receção do equipamento, por transferência bancária ou MBWay. Para obter os dados de pagamento, por favor contacte-nos.</p>
      </td></tr>
    </table>

    <p style="font-size:13px;color:${TEXT_MED};line-height:1.6;">Agradecemos a regularização da situação com a maior brevidade possível. Se já efetuou o pagamento, por favor ignore esta comunicação.</p>
    <p style="font-size:13px;color:${TEXT_LIGHT};margin-top:20px;text-align:center;">Agradecemos a sua preferência e confiança.</p>`;

  return emailWrapper('#ffffff', header, body);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 3: AGUARDAR PEÇAS
// ═══════════════════════════════════════════════════════════════

function generatePartNoticeTemplate(service: any) {
  const header = headerWithLogo(AMBER, 'Atualização: Aguardando Peças', `Processo ${service.code}`);

  const body = `
    <p style="font-size:15px;">Caro(a) <strong>${customerName(service)}</strong>,</p>
    <p style="font-size:14px;color:${TEXT_MED};line-height:1.6;">Informamos que a reparação do seu equipamento se encontra atualmente <strong>a aguardar a receção de peças específicas</strong>, encomendadas ao fabricante.</p>

    <!-- Equipment card -->
    ${sectionTitle('Equipamento')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GRAY_BG};border:1px solid ${GRAY_BORDER};border-radius:8px;">
      ${infoRow('Equipamento', [service.appliance_type, service.brand].filter(Boolean).join(' '))}
      ${infoRow('Modelo', service.model || '—')}
      ${service.serial_number ? infoRow('Nº Série', service.serial_number) : ''}
      ${infoRow('Chamado', service.code)}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td style="background:#fffff0;border-left:4px solid ${AMBER};padding:16px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:${TEXT_MED};line-height:1.6;">O seu equipamento encontra-se em segurança na nossa oficina. Assim que o material chegar, retomaremos o trabalho e entraremos em contacto para agendar a conclusão/entrega.</p>
      </td></tr>
    </table>

    <p style="font-size:13px;color:${TEXT_LIGHT};margin-top:24px;text-align:center;">Obrigado pela sua compreensão e confiança. 🛠️</p>`;

  return emailWrapper(AMBER, header, body);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 4: MENSAGEM PERSONALIZADA
// ═══════════════════════════════════════════════════════════════

function generateCustomMessageTemplate(service: any, message: string) {
  const header = headerWithLogo(BLUE, 'Informação Tecnofrio', `Assunto: Serviço ${service.code}`);

  const body = `
    <p style="font-size:15px;">Caro(a) <strong>${customerName(service)}</strong>,</p>
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr><td style="font-size:15px;line-height:1.8;color:${TEXT_DARK};white-space:pre-wrap;">${message || 'Temos uma atualização sobre o seu processo em curso.'}</td></tr>
    </table>

    ${sectionTitle('Equipamento')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GRAY_BG};border:1px solid ${GRAY_BORDER};border-radius:8px;">
      ${infoRow('Equipamento', [service.appliance_type, service.brand, service.model].filter(Boolean).join(' '))}
      ${infoRow('Processo', service.code)}
    </table>`;

  return emailWrapper(BLUE, header, body);
}
