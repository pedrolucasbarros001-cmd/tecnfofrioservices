import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const COMPANY = {
  name: 'TECNOFRIO',
  address: 'R. Dom Pedro IV 3 R/C, Bairro da Coxa',
  postalCode: '5300-124',
  city: 'Bragança',
  phone: '273 332 772',
  email: 'tecno.frio@sapo.pt',
}

const LOGO_URL = 'https://flialeqlwrtfnonxtsnx.supabase.co/storage/v1/object/public/service-photos/tecnofrio-logo.png'

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
    const custom_message = body.custom_message;

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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RESEND_API_KEY) throw new Error("RESEND API KEY não configurada");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*, customer:customers(*), tech:technicians!services_technician_id_fkey(*, profile:profiles(*))')
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
      subject = `Ficha de Serviço - ${service.code}`;
      htmlContent = await generateVisitReportTemplate(supabase, service, techName);
    } else if (action_type === 'payment_reminder') {
      subject = `Aviso de Valor Pendente - ${service.code}`;
      htmlContent = await generatePaymentReminderTemplate(supabase, service);
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

function emailWrapper(bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf2f7;">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid ${GRAY_BORDER};">
  ${bodyContent}
  <!-- FOOTER -->
  <tr><td style="background:${GRAY_BG};padding:16px 24px;border-top:1px solid ${GRAY_BORDER};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:${TEXT_DARK};">${COMPANY.name}</p>
        <p style="margin:0 0 2px;font-size:10px;color:${TEXT_LIGHT};">${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}</p>
        <p style="margin:0 0 2px;font-size:10px;color:${TEXT_LIGHT};">Tel: ${COMPANY.phone} | ${COMPANY.email}</p>
        <p style="margin:6px 0 0;font-size:9px;color:#a0aec0;">Este é um email automático. Por favor não responda diretamente.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function sectionHeader(title: string) {
  return `<tr><td style="padding:8px 24px 4px;">
    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;color:${BLUE_LIGHT};letter-spacing:0.5px;border-bottom:1px solid ${GRAY_BORDER};padding-bottom:4px;">${title}</p>
  </td></tr>`;
}

function gridRow(cells: { label: string; value: string; colspan?: number }[]) {
  const tds = cells.map(c => {
    const cs = c.colspan ? ` colspan="${c.colspan}"` : '';
    const w = c.colspan ? '' : ' width="50%"';
    return `<td${w}${cs} style="padding:3px 24px;vertical-align:top;">
      <span style="font-size:10px;color:${TEXT_LIGHT};">${c.label}:</span>
      <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;margin-left:4px;">${c.value || 'N/A'}</span>
    </td>`;
  }).join('');
  return `<tr>${tds}</tr>`;
}

function customerName(service: any) {
  return service.contact_name || service.customer?.name || 'Cliente';
}

function formatDate(d?: string) {
  if (!d) return new Date().toLocaleDateString('pt-PT');
  return new Date(d).toLocaleDateString('pt-PT');
}

function formatDateTime(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-PT') + ' ' + dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(v: number) {
  return v.toFixed(2).replace('.', ',') + ' €';
}

function safeNumber(v: any) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    por_fazer: 'Aberto', em_execucao: 'Em Execução', na_oficina: 'Oficina',
    para_pedir_peca: 'Pedir Peça', em_espera_de_peca: 'Espera de Peça',
    a_precificar: 'Orçamentar', concluidos: 'Oficina Reparados',
    em_debito: 'Em Débito', finalizado: 'Concluídos', cancelado: 'Cancelado',
  };
  return map[status] || status;
}

function getSignatureDescription(type: string | null): string {
  switch (type) {
    case 'recolha': return 'Autorização de levantamento do aparelho para reparação em oficina';
    case 'entrega': return 'Confirmação da entrega do aparelho';
    case 'visita': return 'Confirmação da execução do serviço no local';
    case 'pedido_peca': return 'Autorização para encomenda de peça';
    default: return 'Assinatura do cliente';
  }
}

function separator() {
  return `<tr><td style="padding:0 24px;"><hr style="border:0;border-top:1px solid ${GRAY_BORDER};margin:6px 0;" /></td></tr>`;
}

// ═══════════════════════════════════════════════════════════════
// Ficha de Serviço Header (shared across report & payment)
// ═══════════════════════════════════════════════════════════════

function fichaHeader(service: any, title: string) {
  return `
  <!-- Header -->
  <tr><td style="padding:20px 24px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <img src="${LOGO_URL}" alt="Tecnofrio" height="36" style="height:36px;display:block;" />
          <p style="margin:4px 0 0;font-size:9px;color:${TEXT_LIGHT};line-height:1.3;">${COMPANY.address}<br/>${COMPANY.postalCode} ${COMPANY.city}<br/>Tel: ${COMPANY.phone} | ${COMPANY.email}</p>
        </td>
        <td align="right" style="vertical-align:top;">
          <p style="margin:0;font-size:16px;font-weight:700;color:${TEXT_DARK};">${title}</p>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:4px 24px 8px;">
    <p style="margin:0;font-size:14px;font-weight:700;font-family:monospace;color:${TEXT_DARK};">Código: ${service.code}</p>
    <p style="margin:2px 0 0;font-size:10px;color:${TEXT_LIGHT};">Data de Entrada: ${formatDateTime(service.created_at)}</p>
  </td></tr>`;
}

// ═══════════════════════════════════════════════════════════════
// Customer + Service + Equipment sections (reusable blocks)
// ═══════════════════════════════════════════════════════════════

function customerSection(service: any) {
  const c = service.customer || {};
  const addr = [service.service_address || c.address, service.service_postal_code || c.postal_code, service.service_city || c.city].filter(Boolean).join(', ') || 'N/A';
  return `
  ${sectionHeader('Dados do Cliente')}
  ${gridRow([
    { label: 'Nome', value: customerName(service) },
    { label: 'Contribuinte', value: c.nif || 'N/A' },
  ])}
  ${gridRow([
    { label: 'Telefone', value: service.contact_phone || c.phone || 'N/A' },
    { label: 'Email', value: service.contact_email || c.email || 'N/A' },
  ])}
  <tr><td colspan="2" style="padding:3px 24px;">
    <span style="font-size:10px;color:${TEXT_LIGHT};">Morada:</span>
    <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;margin-left:4px;">${addr}</span>
  </td></tr>`;
}

function serviceDetailsSection(service: any) {
  const locLabel = service.service_location === 'cliente' ? 'Visita' : 'Oficina';
  return `
  ${separator()}
  ${sectionHeader('Detalhes do Serviço')}
  <tr>
    <td width="33%" style="padding:3px 24px;"><span style="font-size:10px;color:${TEXT_LIGHT};">Categoria:</span> <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;text-transform:capitalize;">${service.service_type || 'Reparação'}</span></td>
    <td width="33%" style="padding:3px 0;"><span style="font-size:10px;color:${TEXT_LIGHT};">Tipo:</span> <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;">${locLabel}</span></td>
    <td width="34%" style="padding:3px 0;"><span style="font-size:10px;color:${TEXT_LIGHT};">Estado:</span> <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;">${getStatusLabel(service.status)}</span></td>
  </tr>
  <tr>
    <td style="padding:3px 24px;"><span style="font-size:10px;color:${TEXT_LIGHT};">Prioridade:</span> <span style="font-size:12px;color:${service.is_urgent ? RED : TEXT_DARK};font-weight:${service.is_urgent ? '700' : '500'};">${service.is_urgent ? 'Urgente' : 'Normal'}</span></td>
    <td colspan="2" style="padding:3px 0;"><span style="font-size:10px;color:${TEXT_LIGHT};">Data Agendada:</span> <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;">${service.scheduled_date ? formatDate(service.scheduled_date) : 'Não agendado'}</span></td>
  </tr>`;
}

function equipmentSection(service: any) {
  let html = `
  ${separator()}
  ${sectionHeader('Detalhes do Equipamento')}
  ${gridRow([
    { label: 'Tipo', value: service.appliance_type || 'N/A' },
    { label: 'Marca', value: service.brand || 'N/A' },
  ])}
  ${gridRow([
    { label: 'Modelo', value: service.model || 'N/A' },
    { label: 'Nº Série', value: service.serial_number || 'N/A' },
  ])}
  ${gridRow([
    { label: 'PNC', value: service.pnc || 'N/A' },
  ])}
  <tr><td colspan="2" style="padding:3px 24px;">
    <span style="font-size:10px;color:${TEXT_LIGHT};">Avaria:</span>
    <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;margin-left:4px;">${service.fault_description || 'N/A'}</span>
  </td></tr>`;

  if (service.detected_fault) {
    html += `<tr><td colspan="2" style="padding:3px 24px;">
      <span style="font-size:10px;color:${TEXT_LIGHT};">Diagnóstico:</span>
      <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;margin-left:4px;">${service.detected_fault}</span>
    </td></tr>`;
  }

  return html;
}

function warrantySection(service: any) {
  if (!service.is_warranty) return '';
  return `
  ${separator()}
  <tr><td colspan="2" style="padding:6px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:4px;">
      <tr><td style="padding:8px 12px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b21a8;">Serviço em Garantia</p>
        <span style="font-size:10px;color:#7c3aed;">Marca:</span> <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;">${service.warranty_brand || 'N/A'}</span>
        &nbsp;&nbsp;
        <span style="font-size:10px;color:#7c3aed;">Processo:</span> <span style="font-size:12px;color:${TEXT_DARK};font-weight:500;">${service.warranty_process_number || 'N/A'}</span>
      </td></tr>
    </table>
  </td></tr>`;
}

// ═══════════════════════════════════════════════════════════════
// Financial summary block
// ═══════════════════════════════════════════════════════════════

function financialSummary(service: any, usedParts: any[], payments: any[], highlightDebt: boolean) {
  const totalPartsCost = usedParts.reduce((s: number, p: any) => s + safeNumber(p.cost) * safeNumber(p.quantity || 1), 0);
  const totalPartsIVA = usedParts.reduce((s: number, p: any) => s + (safeNumber(p.cost) * safeNumber(p.quantity || 1) * (safeNumber(p.iva_rate) / 100)), 0);
  const displaySubtotal = totalPartsCost;
  const displayIVA = totalPartsIVA;
  const laborCost = safeNumber(service.labor_cost);
  const discount = safeNumber(service.discount);
  const finalPrice = safeNumber(service.final_price);
  const totalPaid = payments.reduce((s: number, p: any) => s + safeNumber(p.amount), 0);
  const debt = finalPrice - totalPaid;

  if (finalPrice <= 0) return '';

  const row = (label: string, value: string, bold = false, color = TEXT_DARK) =>
    `<tr>
      <td style="padding:2px 0;font-size:11px;color:${TEXT_MED};text-align:right;padding-right:12px;">${label}</td>
      <td style="padding:2px 0;font-size:${bold ? '13px' : '11px'};color:${color};font-weight:${bold ? '700' : '500'};text-align:right;width:100px;">${value}</td>
    </tr>`;

  let rows = '';
  if (displaySubtotal > 0) rows += row('Subtotal Artigos:', formatCurrency(displaySubtotal));
  if (laborCost > 0) rows += row('Mão de obra:', formatCurrency(laborCost));
  if (displayIVA > 0) rows += row('IVA:', formatCurrency(displayIVA));
  if (discount > 0) rows += row('Desconto:', '-' + formatCurrency(discount), false, '#38a169');
  rows += `<tr><td colspan="2" style="padding:0;"><hr style="border:0;border-top:1px solid ${GRAY_BORDER};margin:4px 0;" /></td></tr>`;
  rows += row('TOTAL:', formatCurrency(finalPrice), true);
  if (totalPaid > 0) rows += row('Pago:', formatCurrency(totalPaid), false, '#38a169');
  if (debt > 0) {
    if (highlightDebt) {
      rows += `<tr>
        <td style="padding:2px 0;font-size:11px;color:${RED};font-weight:700;text-align:right;padding-right:12px;">Em Débito:</td>
        <td style="padding:6px 8px;font-size:18px;color:#ffffff;font-weight:800;text-align:right;background:${RED};border-radius:4px;">${formatCurrency(debt)}</td>
      </tr>`;
    } else {
      rows += row('Em Débito:', formatCurrency(debt), true, RED);
    }
  }

  return `
  ${separator()}
  ${sectionHeader('Resumo Financeiro')}
  <tr><td style="padding:4px 24px;" colspan="2">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-left:auto;">
      ${rows}
    </table>
  </td></tr>`;
}

// ═══════════════════════════════════════════════════════════════
// Payments history block
// ═══════════════════════════════════════════════════════════════

function paymentsHistoryBlock(payments: any[]) {
  if (payments.length === 0) return '';
  const rows = payments.map((p: any) => `<tr>
    <td style="padding:4px 8px;font-size:11px;color:${TEXT_DARK};border-bottom:1px solid ${GRAY_BORDER};">${p.payment_date ? formatDate(p.payment_date) : '—'}</td>
    <td style="padding:4px 8px;font-size:11px;color:${TEXT_DARK};border-bottom:1px solid ${GRAY_BORDER};text-transform:capitalize;">${p.payment_method || '—'}</td>
    <td style="padding:4px 8px;font-size:11px;color:${TEXT_DARK};border-bottom:1px solid ${GRAY_BORDER};">${p.description || '—'}</td>
    <td style="padding:4px 8px;font-size:11px;color:${TEXT_DARK};border-bottom:1px solid ${GRAY_BORDER};text-align:right;">${formatCurrency(safeNumber(p.amount))}</td>
  </tr>`).join('');

  return `
  ${separator()}
  ${sectionHeader('Histórico de Pagamentos')}
  <tr><td style="padding:4px 24px;" colspan="2">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY_BORDER};border-radius:4px;overflow:hidden;">
      <tr style="background:${GRAY_BG};">
        <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Data</th>
        <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Método</th>
        <th style="padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Descrição</th>
        <th style="padding:6px 8px;text-align:right;font-size:10px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Valor</th>
      </tr>
      ${rows}
    </table>
  </td></tr>`;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 1: RELATÓRIO / FICHA DE SERVIÇO
// ═══════════════════════════════════════════════════════════════

async function generateVisitReportTemplate(supabase: any, service: any, techName: string) {
  const [partsRes, photosRes, docsRes, paymentsRes, sigsRes] = await Promise.all([
    supabase.from('service_parts').select('*').eq('service_id', service.id).order('created_at', { ascending: true }),
    supabase.from('service_photos').select('*').eq('service_id', service.id),
    supabase.from('service_documents').select('*').eq('service_id', service.id),
    supabase.from('service_payments').select('*').eq('service_id', service.id).order('payment_date', { ascending: false }),
    supabase.from('service_signatures').select('*').eq('service_id', service.id).order('signed_at', { ascending: true }),
  ]);

  const allParts = partsRes.data || [];
  const usedParts = allParts.filter((p: any) => !p.is_requested);
  const requestedParts = allParts.filter((p: any) => p.is_requested);
  const photos = photosRes.data || [];
  const docs = docsRes.data || [];
  const payments = paymentsRes.data || [];
  const signatures = sigsRes.data || [];

  let content = '';

  // Header
  content += fichaHeader(service, 'Ficha de Serviço');

  // Greeting
  content += `<tr><td style="padding:8px 24px;">
    <p style="font-size:13px;color:${TEXT_MED};line-height:1.5;margin:0;">Caro(a) <strong>${customerName(service)}</strong>, segue o relatório detalhado da intervenção realizada ao seu equipamento.</p>
  </td></tr>`;

  // Customer
  content += customerSection(service);

  // Service details
  content += serviceDetailsSection(service);

  // Equipment
  content += equipmentSection(service);

  // Warranty
  content += warrantySection(service);

  // Work performed
  if (service.work_performed) {
    content += separator();
    content += sectionHeader('Trabalho Realizado');
    content += `<tr><td colspan="2" style="padding:4px 24px;">
      <p style="margin:0;font-size:12px;line-height:1.5;color:${TEXT_DARK};white-space:pre-wrap;">${service.work_performed}</p>
    </td></tr>`;
  }

  // Used parts table
  if (usedParts.length > 0) {
    let partsTotal = 0;
    const rows = usedParts.map((p: any) => {
      const qty = safeNumber(p.quantity || 1);
      const cost = safeNumber(p.cost);
      const lineTotal = qty * cost;
      partsTotal += lineTotal;
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:10px;color:${TEXT_LIGHT};">${p.part_code || '—'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:11px;color:${TEXT_DARK};">${p.part_name}</td>
        <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:11px;color:${TEXT_DARK};text-align:center;">${qty}</td>
        <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:11px;color:${TEXT_DARK};text-align:right;">${formatCurrency(cost)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:11px;color:${TEXT_DARK};text-align:right;font-weight:600;">${formatCurrency(lineTotal)}</td>
      </tr>`;
    }).join('');

    content += separator();
    content += sectionHeader('Artigos do Serviço');
    content += `<tr><td style="padding:4px 24px;" colspan="2">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY_BORDER};border-radius:4px;overflow:hidden;">
        <tr style="background:${GRAY_BG};">
          <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Ref.</th>
          <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Descrição</th>
          <th style="padding:6px 8px;text-align:center;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Qtd</th>
          <th style="padding:6px 8px;text-align:right;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Valor Unit.</th>
          <th style="padding:6px 8px;text-align:right;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Total</th>
        </tr>
        ${rows}
        <tr style="background:${GRAY_BG};">
          <td colspan="4" style="padding:6px 8px;font-size:11px;font-weight:700;color:${TEXT_DARK};text-align:right;">Subtotal Artigos:</td>
          <td style="padding:6px 8px;font-size:12px;font-weight:800;color:${BLUE};text-align:right;">${formatCurrency(partsTotal)}</td>
        </tr>
      </table>
    </td></tr>`;
  }

  // Requested parts
  if (requestedParts.length > 0) {
    const rows = requestedParts.map((p: any) => `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:11px;color:${TEXT_DARK};font-weight:500;">${p.part_name}</td>
      <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:10px;color:${TEXT_LIGHT};">${p.part_code || '—'}</td>
      <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};font-size:11px;color:${TEXT_DARK};">${formatDate(p.created_at)}</td>
      <td style="padding:4px 8px;border-bottom:1px solid ${GRAY_BORDER};"><span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:3px;font-weight:600;">Solicitada</span></td>
    </tr>`).join('');

    content += separator();
    content += sectionHeader('Peças Solicitadas');
    content += `<tr><td style="padding:4px 24px;" colspan="2">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${GRAY_BORDER};border-radius:4px;overflow:hidden;">
        <tr style="background:${GRAY_BG};">
          <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Peça</th>
          <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Referência</th>
          <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Data Pedido</th>
          <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Estado</th>
        </tr>
        ${rows}
      </table>
    </td></tr>`;
  }

  // Financial summary
  content += financialSummary(service, usedParts, payments, false);

  // Payment history
  content += paymentsHistoryBlock(payments);

  // Signatures
  if (signatures.length > 0) {
    content += separator();
    content += sectionHeader('Assinaturas Recolhidas');
    const sigItems = signatures.map((sig: any) => `
      <tr><td style="padding:4px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:${GRAY_BG};border:1px solid ${GRAY_BORDER};border-radius:4px;margin-bottom:6px;">
          <tr>
            <td style="padding:8px;"><img src="${sig.file_url}" alt="Assinatura" style="width:96px;height:56px;object-fit:contain;border:1px solid ${GRAY_BORDER};background:#ffffff;border-radius:3px;" /></td>
            <td style="padding:8px;vertical-align:top;">
              <p style="margin:0;font-size:11px;font-weight:600;color:${TEXT_DARK};">${sig.signer_name || 'Cliente'}</p>
              <p style="margin:2px 0 0;font-size:9px;color:${TEXT_LIGHT};line-height:1.3;">${getSignatureDescription(sig.signature_type)}</p>
              <p style="margin:2px 0 0;font-size:9px;color:${TEXT_LIGHT};">${formatDateTime(sig.signed_at)}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    `).join('');
    content += sigItems;
  }

  // Photos (max 4)
  if (photos.length > 0) {
    content += separator();
    content += sectionHeader('Registo Fotográfico');
    const photoItems = photos.slice(0, 4).map((p: any) => `
      <td width="50%" style="padding:4px;vertical-align:top;">
        <img src="${p.file_url}" alt="${p.description || 'Foto'}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;border:1px solid ${GRAY_BORDER};display:block;" />
        ${p.description ? `<p style="margin:2px 0 0;font-size:9px;color:${TEXT_LIGHT};text-align:center;">${p.description}</p>` : ''}
      </td>`);
    const photoRows = [];
    for (let i = 0; i < photoItems.length; i += 2) {
      photoRows.push(`<tr>${photoItems[i]}${photoItems[i + 1] || '<td></td>'}</tr>`);
    }
    content += `<tr><td style="padding:4px 24px;" colspan="2">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${photoRows.join('')}</table>
    </td></tr>`;
  }

  // Documents
  if (docs.length > 0) {
    content += separator();
    content += sectionHeader('Documentação Anexa');
    const items = docs.map((d: any) => `<tr><td style="padding:3px 24px;">
      <a href="${d.file_url}" style="color:${BLUE_LIGHT};text-decoration:none;font-size:11px;">📎 ${d.file_name}</a>
    </td></tr>`).join('');
    content += items;
  }

  // Technician
  content += `<tr><td style="padding:16px 24px 8px;" colspan="2">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${GRAY_BORDER};padding-top:10px;">
      <tr><td align="center">
        <p style="margin:0;font-size:9px;text-transform:uppercase;color:${TEXT_LIGHT};font-weight:700;">Técnico Responsável</p>
        <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:${BLUE};">${techName}</p>
      </td></tr>
    </table>
  </td></tr>`;

  return emailWrapper(content);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 2: LEMBRETE DE PAGAMENTO
// ═══════════════════════════════════════════════════════════════

async function generatePaymentReminderTemplate(supabase: any, service: any) {
  const [paymentsRes, partsRes] = await Promise.all([
    supabase.from('service_payments').select('*').eq('service_id', service.id).order('payment_date', { ascending: false }),
    supabase.from('service_parts').select('*').eq('service_id', service.id).eq('is_requested', false),
  ]);
  const payments = paymentsRes.data || [];
  const usedParts = partsRes.data || [];
  const totalPaid = payments.reduce((s: number, p: any) => s + safeNumber(p.amount), 0);
  const balance = safeNumber(service.final_price) - totalPaid;

  let content = '';

  // Header with red alert banner
  content += `
  <tr><td style="padding:20px 24px 8px;" align="center">
    <img src="${LOGO_URL}" alt="Tecnofrio" height="36" style="height:36px;" />
  </td></tr>
  <tr><td style="padding:8px 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${RED};border-radius:6px;">
      <tr><td align="center" style="padding:14px;">
        <h1 style="margin:0;font-size:18px;color:#ffffff;letter-spacing:0.5px;">⚠ AVISO DE VALOR PENDENTE</h1>
        <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.8);">Serviço ${service.code} · ${formatDate(service.created_at)}</p>
      </td></tr>
    </table>
  </td></tr>`;

  // Greeting
  content += `<tr><td style="padding:4px 24px 8px;">
    <p style="font-size:13px;color:${TEXT_MED};line-height:1.5;margin:0;">Caro(a) <strong>${customerName(service)}</strong>, verificámos que o valor indicado abaixo, relativo à intervenção técnica no seu equipamento, ainda se encontra pendente de regularização.</p>
  </td></tr>`;

  // Big balance highlight
  content += `<tr><td style="padding:8px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f5;border:2px dashed #feb2b2;border-radius:8px;">
      <tr><td align="center" style="padding:20px;">
        <p style="margin:0;font-size:10px;text-transform:uppercase;color:${RED};font-weight:700;">Valor Pendente</p>
        <p style="margin:6px 0 0;font-size:36px;font-weight:800;color:${RED};letter-spacing:-1px;">${formatCurrency(balance)}</p>
      </td></tr>
    </table>
  </td></tr>`;

  // Customer (brief)
  content += customerSection(service);

  // Equipment (brief)
  content += equipmentSection(service);

  // Financial summary with highlighted debt
  content += financialSummary(service, usedParts, payments, true);

  // Payment history
  content += paymentsHistoryBlock(payments);

  // Payment info
  content += `<tr><td style="padding:12px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffff0;border:1px solid #fefcbf;border-radius:6px;">
      <tr><td style="padding:12px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;color:${AMBER};">Dados de Pagamento</p>
        <p style="margin:0;font-size:11px;color:${TEXT_MED};line-height:1.5;">Poderá efetuar o pagamento no ato da receção do equipamento, por transferência bancária ou MBWay. Para obter os dados de pagamento, por favor contacte-nos.</p>
      </td></tr>
    </table>
  </td></tr>`;

  content += `<tr><td style="padding:8px 24px;">
    <p style="font-size:11px;color:${TEXT_MED};line-height:1.5;margin:0;">Agradecemos a regularização da situação com a maior brevidade possível. Se já efetuou o pagamento, por favor ignore esta comunicação.</p>
  </td></tr>`;

  return emailWrapper(content);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 3: AGUARDAR PEÇAS
// ═══════════════════════════════════════════════════════════════

function generatePartNoticeTemplate(service: any) {
  let content = '';

  content += fichaHeader(service, 'Atualização de Serviço');

  content += `<tr><td style="padding:8px 24px;">
    <p style="font-size:13px;color:${TEXT_MED};line-height:1.5;margin:0;">Caro(a) <strong>${customerName(service)}</strong>, informamos que a reparação do seu equipamento se encontra atualmente <strong>a aguardar a receção de peças específicas</strong>, encomendadas ao fabricante.</p>
  </td></tr>`;

  content += customerSection(service);
  content += equipmentSection(service);

  content += `<tr><td style="padding:12px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffff0;border-left:4px solid ${AMBER};border-radius:0 6px 6px 0;">
      <tr><td style="padding:12px;">
        <p style="margin:0;font-size:12px;color:${TEXT_MED};line-height:1.5;">O seu equipamento encontra-se em segurança na nossa oficina. Assim que o material chegar, retomaremos o trabalho e entraremos em contacto para agendar a conclusão/entrega.</p>
      </td></tr>
    </table>
  </td></tr>`;

  content += `<tr><td style="padding:8px 24px;">
    <p style="font-size:11px;color:${TEXT_LIGHT};text-align:center;margin:0;">Obrigado pela sua compreensão e confiança. 🛠️</p>
  </td></tr>`;

  return emailWrapper(content);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 4: MENSAGEM PERSONALIZADA
// ═══════════════════════════════════════════════════════════════

function generateCustomMessageTemplate(service: any, message: string) {
  let content = '';

  content += fichaHeader(service, 'Informação Tecnofrio');

  content += `<tr><td style="padding:8px 24px;">
    <p style="font-size:13px;margin:0;">Caro(a) <strong>${customerName(service)}</strong>,</p>
  </td></tr>`;

  content += `<tr><td style="padding:8px 24px;">
    <p style="font-size:13px;line-height:1.7;color:${TEXT_DARK};white-space:pre-wrap;margin:0;">${message || 'Temos uma atualização sobre o seu processo em curso.'}</p>
  </td></tr>`;

  content += equipmentSection(service);

  return emailWrapper(content);
}
