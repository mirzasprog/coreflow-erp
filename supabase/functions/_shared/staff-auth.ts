import { createClient } from 'npm:@supabase/supabase-js@2';

export class AccessError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}

export async function requireStaff(req: Request, allowedRoles: string[], companyId?: string) {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) throw new AccessError('Service unavailable', 503);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new AccessError('Authentication required', 401);
  const scoped = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await scoped.auth.getUser();
  if (error || !user) throw new AccessError('Authentication required', 401);
  const admin = createClient(url, service);
  const { data: grants, error: grantsError } = await admin.from('user_roles')
    .select('role, company_id').eq('user_id', user.id);
  if (grantsError) throw new AccessError('Staff permissions unavailable', 503);
  const permitted = (grants ?? []).filter(g => allowedRoles.includes(g.role) || g.role === 'SystemAdmin');
  if (!permitted.length || (companyId && !permitted.some(g => g.company_id === companyId))) {
    throw new AccessError('You do not have permission for this operation');
  }
  return { user, scoped, admin, grants: permitted };
}