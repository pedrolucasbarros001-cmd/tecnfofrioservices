import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin-only helper: lists large photos and issues signed download/upload URLs
// so old photos can be re-compressed in place (same path, same DB url).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "unauthorized" }, 401);
  const { data: isDono } = await admin.rpc("is_dono", { _user_id: u.user.id });
  if (!isDono) return json({ error: "forbidden" }, 403);

  const body = await req.json();
  const bucket = "service-photos";

  if (body.action === "folders") {
    const out: string[] = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await admin.storage.from(bucket).list("", { limit: 1000, offset: off });
      if (error) return json({ error: error.message }, 500);
      out.push(...(data || []).filter((o: any) => !o.id).map((o: any) => o.name));
      if (!data || data.length < 1000) break;
    }
    return json({ folders: out });
  }
  if (body.action === "files") {
    const { data, error } = await admin.storage.from(bucket).list(String(body.folder), { limit: 1000 });
    if (error) return json({ error: error.message }, 500);
    return json({ items: (data || []).filter((o: any) => o.id).map((o: any) => ({ name: `${body.folder}/${o.name}`, size: Number(o.metadata?.size || 0) })) });
  }
  if (body.action === "sign") {
    const path = String(body.path);
    const dl = await admin.storage.from(bucket).createSignedUrl(path, 600);
    const up = await admin.storage.from(bucket).createSignedUploadUrl(path, { upsert: true });
    if (dl.error || up.error) return json({ error: dl.error?.message || up.error?.message }, 500);
    return json({ download: dl.data.signedUrl, uploadToken: up.data.token });
  }
  return json({ error: "bad action" }, 400);
});
