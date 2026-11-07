import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { AccessError, requireStaff } from '../_shared/staff-auth.ts';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { admin, grants } = await requireStaff(req, ['SystemAdmin']);
    const { email, new_password } = await req.json();
    if (!email || !new_password) {
      return new Response(JSON.stringify({ error: "email i new_password su obavezni" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Find user
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = list.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      return new Response(JSON.stringify({ error: "Korisnik nije pronađen" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles, error: roleError } = await admin.from('user_roles').select('company_id').eq('user_id', user.id);
    if (roleError || !roles?.some(role => grants.some(grant => grant.company_id === role.company_id))) throw new AccessError('Target user is not staff in your company');
    if (typeof new_password !== 'string' || new_password.length < 12) throw new AccessError('Password must contain at least 12 characters', 400);

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({ success: true, user_id: user.id, email: user.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: e instanceof AccessError ? e.status : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
