import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Appliance type extraction from "Assunto" text
function extractApplianceType(assunto: string): string | null {
  if (!assunto) return null;
  const lower = assunto.toLowerCase();

  const map: [RegExp, string][] = [
    [/\bmlr\b/, "Máquina Lavar Roupa"],
    [/\bmll\b/, "Máquina Lavar Louça"],
    [/\bmsr\b/, "Máquina Secar Roupa"],
    [/\bacs?\b|\bar condicionado\b/, "Ar Condicionado"],
    [/\bcaldeira\b|calseira/, "Caldeira"],
    [/\besquentador\b|esquentar/, "Esquentador"],
    [/\bfrigorifico\b|frigorífico/, "Frigorífico"],
    [/\bforno\b/, "Forno"],
    [/\bplaca\b/, "Placa"],
    [/\bmicroondas\b|micro-ondas/, "Microondas"],
    [/\barca\b/, "Arca"],
    [/\bcombinado\b/, "Combinado"],
    [/\bcilindro\b/, "Cilindro"],
    [/\bvitrine\b|vitrina/, "Vitrine Frigorífica"],
    [/\bmáquina de lavar roupa\b|maquina de lavar roupa/, "Máquina Lavar Roupa"],
    [/\bmáquina de lavar louça\b|maquina de lavar louça|maquina de lavar loiça/, "Máquina Lavar Louça"],
    [/\bmáquina de secar\b|maquina de secar/, "Máquina Secar Roupa"],
    [/\btermoacumulador\b/, "Termoacumulador"],
    [/\bradiador\b/, "Radiador"],
    [/\bexaustor\b/, "Exaustor"],
  ];

  for (const [regex, label] of map) {
    if (regex.test(lower)) return label;
  }
  return null;
}

// Parse Portuguese currency "1.234,56€" or "1.234,56eur" to number
function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/[€eur\s]/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Detect if a customer is "empresa" based on name keywords
function detectCustomerType(name: string): string {
  if (!name) return "particular";
  const lower = name.toLowerCase();
  const keywords = [
    "lda", "ltda", "sa ", "s.a", "hotel", "restaur", "imobili",
    "agrupamento", "centro", "junta", "igreja", "paroquial",
    "epm", "gnr", "câmara", "camara", "churrasqueira", "residencial",
    "clínica", "clinica", "padaria", "pastelaria", "café", "cafe",
    "farmácia", "farmacia", "mercado", "talho", "supermercado",
    "lar ", "associação", "associacao", "cooperativa", "escola",
    "colégio", "colegio", "instituto", "fundação", "fundacao",
    "bar ", "snack", "pizzaria", "casa de", "nordestemóvel",
    "unipessoal",
  ];
  return keywords.some((k) => lower.includes(k)) ? "empresa" : "particular";
}

// Map CSV status to system status
function mapStatus(
  estado: string,
  pagamento: string,
): { status: string; service_location: string; amount_paid_equals_final: boolean; final_price_zero: boolean } {
  const e = (estado || "").toLowerCase().trim();
  const p = (pagamento || "").toLowerCase().trim();

  if (e.includes("oficina")) {
    return { status: "na_oficina", service_location: "oficina", amount_paid_equals_final: false, final_price_zero: false };
  }
  if (e.includes("pendente de pe")) {
    return { status: "em_espera_de_peca", service_location: "cliente", amount_paid_equals_final: false, final_price_zero: false };
  }
  if (e.includes("aceite")) {
    return { status: "em_execucao", service_location: "cliente", amount_paid_equals_final: false, final_price_zero: false };
  }
  if (e.includes("conclu")) {
    if (p.includes("não gerou") || p.includes("nao gerou")) {
      return { status: "finalizado", service_location: "cliente", amount_paid_equals_final: false, final_price_zero: true };
    }
    if (p.includes("pago") && !p.includes("não") && !p.includes("nao")) {
      return { status: "finalizado", service_location: "cliente", amount_paid_equals_final: true, final_price_zero: false };
    }
    // "Não Pago" on concluded = em_debito
    return { status: "em_debito", service_location: "cliente", amount_paid_equals_final: false, final_price_zero: false };
  }
  if (e.includes("recusada") || e.includes("cancelada")) {
    return { status: "finalizado", service_location: "cliente", amount_paid_equals_final: false, final_price_zero: true };
  }
  // Default: aberta
  return { status: "por_fazer", service_location: "cliente", amount_paid_equals_final: false, final_price_zero: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user is "dono"
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for inserts
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.user.id)
      .single();

    if (roleData?.role !== "dono") {
      return new Response(JSON.stringify({ error: "Apenas o dono pode importar dados" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { customers, services } = await req.json();

    const errors: string[] = [];
    let customersImported = 0;
    let servicesImported = 0;

    // --- STEP 1: Import customers in batches ---
    if (customers && customers.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < customers.length; i += BATCH) {
        const batch = customers.slice(i, i + BATCH).map((c: any) => ({
          name: (c.Empresa || c.name || "").trim(),
          email: (c["E-mail Principal"] || c.email || "").trim() || null,
          phone: (c.Telefone || c.phone || "").trim() || null,
          notes: (c.Grupos || c.notes || "").trim() || null,
          customer_type: detectCustomerType(c.Empresa || c.name || ""),
          created_at: c["Data de Criação"] || c.created_at || new Date().toISOString(),
        })).filter((c: any) => c.name);

        const { error } = await adminClient.from("customers").insert(batch);
        if (error) {
          errors.push(`Customers batch ${i}: ${error.message}`);
        } else {
          customersImported += batch.length;
        }
      }
    }

    // --- STEP 2: Build name→id map ---
    const customerMap: Record<string, string> = {};
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error } = await adminClient
        .from("customers")
        .select("id, name")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      data.forEach((c: any) => {
        customerMap[c.name.toLowerCase().trim()] = c.id;
      });
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    // --- STEP 3: Import services in batches ---
    if (services && services.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < services.length; i += BATCH) {
        const batch = services.slice(i, i + BATCH).map((s: any) => {
          const visita = s["Visita #"] || "";
          const codeNum = visita.replace(/[^\d]/g, "");
          const code = codeNum ? `TF-${codeNum.padStart(5, "0")}` : null;

          const assunto = s.Assunto || "";
          const para = (s.Para || "").trim();
          const customerId = customerMap[para.toLowerCase()] || null;
          const totalStr = s.Total || "0";
          const finalPrice = parseCurrency(totalStr);

          const statusInfo = mapStatus(s.Estado || "", s["Estado de Pagamento"] || "");
          const applianceType = extractApplianceType(assunto);

          let amountPaid = 0;
          if (statusInfo.amount_paid_equals_final) amountPaid = finalPrice;
          const effectiveFinalPrice = statusInfo.final_price_zero ? 0 : finalPrice;

          // Check if assunto starts with "Cancelada" or "CANCELADA"
          const isCancelled = /^cancelad/i.test(assunto.trim());
          const faultDesc = isCancelled
            ? assunto.replace(/^cancelad[ao]?\s*-?\s*/i, "").trim()
            : assunto;

          return {
            code,
            fault_description: faultDesc || null,
            appliance_type: applianceType,
            customer_id: customerId,
            final_price: effectiveFinalPrice,
            amount_paid: amountPaid,
            status: isCancelled ? "finalizado" : statusInfo.status,
            service_location: statusInfo.service_location,
            scheduled_date: s.Data || null,
            created_at: s["Data de Criação"] || new Date().toISOString(),
            service_type: "reparacao",
          };
        }).filter((s: any) => s.code);

        const { error } = await adminClient.from("services").insert(batch);
        if (error) {
          errors.push(`Services batch ${i}: ${error.message}`);
        } else {
          servicesImported += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ customersImported, servicesImported, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
