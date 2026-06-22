// Auto-replenishment edge function
// Runs the unified AI reorder engine server-side and creates DRAFT
// purchase requests (supplier route) and transfer warehouse_documents
// (central -> store route). Triggered manually from the cockpit or daily by pg_cron.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_LEAD_TIME = 7;
const REVIEW_PERIOD_DAYS = 14;
const HISTORY_DAYS = 180;
const RECENT_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let triggeredBy: 'manual' | 'cron' = 'cron';
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.triggered_by === 'manual') triggeredBy = 'manual';
  } catch {}

  try {
    const since = new Date(); since.setDate(since.getDate() - HISTORY_DAYS);
    const sinceStr = since.toISOString().split('T')[0];
    const recentSince = new Date(); recentSince.setDate(recentSince.getDate() - RECENT_DAYS);
    const recentSinceStr = recentSince.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();

    // Stock + items + locations
    const { data: stockRows, error: stockErr } = await supabase
      .from('stock')
      .select(`
        item_id, location_id, quantity, reserved_quantity,
        items!inner(id, code, name, min_stock, max_stock, purchase_price, preferred_supplier_id, active, replenishment_source, central_warehouse_location_id),
        locations!inner(id, name, type, is_central)
      `)
      .eq('items.active', true);
    if (stockErr) throw stockErr;

    const itemIds = Array.from(new Set((stockRows || []).map((s: any) => s.item_id)));
    if (!itemIds.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No items' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: allLocations } = await supabase
      .from('locations').select('id, name, type, is_central').eq('active', true);
    const centralLocations = (allLocations || []).filter((l: any) => l.is_central || l.type === 'warehouse');
    const centralIds = centralLocations.map((l: any) => l.id);
    const locationMeta = new Map<string, any>((allLocations || []).map((l: any) => [l.id, l]));

    const { data: centralStock } = centralIds.length
      ? await supabase.from('stock').select('item_id, location_id, quantity, reserved_quantity').in('item_id', itemIds).in('location_id', centralIds)
      : { data: [] as any[] };
    const centralStockMap = new Map<string, { location_id: string; available: number }[]>();
    (centralStock || []).forEach((s: any) => {
      const arr = centralStockMap.get(s.item_id) || [];
      arr.push({ location_id: s.location_id, available: Number(s.quantity || 0) - Number(s.reserved_quantity || 0) });
      centralStockMap.set(s.item_id, arr);
    });

    // Consumption history: goods_issue
    const { data: issueDocs } = await supabase
      .from('warehouse_documents')
      .select('id, document_date, location_id')
      .eq('document_type', 'goods_issue').eq('status', 'posted')
      .gte('document_date', sinceStr);
    const issueDocMap = new Map((issueDocs || []).map((d: any) => [d.id, d]));
    const issueIds = (issueDocs || []).map((d: any) => d.id);
    const { data: issueLines } = issueIds.length
      ? await supabase.from('warehouse_document_lines').select('document_id, item_id, quantity').in('document_id', issueIds).in('item_id', itemIds)
      : { data: [] as any[] };

    // POS receipts
    const { data: posReceipts } = await supabase
      .from('pos_receipts')
      .select('id, receipt_date, terminal_id, pos_terminals(location_id)')
      .gte('receipt_date', sinceStr);
    const posMap = new Map((posReceipts || []).map((r: any) => [r.id, { date: r.receipt_date, location_id: r.pos_terminals?.location_id }]));
    const posIds = (posReceipts || []).map((r: any) => r.id);
    const { data: posLines } = posIds.length
      ? await supabase.from('pos_receipt_lines').select('receipt_id, item_id, quantity').in('receipt_id', posIds).in('item_id', itemIds)
      : { data: [] as any[] };

    // On-order
    const { data: openPOs } = await supabase.from('purchase_orders').select('id, location_id, status').in('status', ['draft', 'submitted', 'ordered']);
    const poLocMap = new Map((openPOs || []).map((p: any) => [p.id, p.location_id]));
    const openIds = (openPOs || []).map((p: any) => p.id);
    const { data: poLines } = openIds.length
      ? await supabase.from('purchase_order_lines').select('order_id, item_id, quantity, received_quantity').in('order_id', openIds).in('item_id', itemIds)
      : { data: [] as any[] };

    // Active promos
    const { data: promos } = await supabase
      .from('promo_activities')
      .select('id, discount_percent, status, start_date, end_date, promo_items(item_id)')
      .eq('status', 'active').lte('start_date', today).gte('end_date', today);
    const promoItems = new Map<string, number>();
    (promos || []).forEach((p: any) => {
      const uplift = Math.min(2, 1 + Number(p.discount_percent || 0) / 50);
      (p.promo_items || []).forEach((pi: any) => promoItems.set(pi.item_id, Math.max(promoItems.get(pi.item_id) || 1, uplift)));
    });

    // Aggregate consumption
    type Bucket = { total: number; recent: number; monthBuckets: number[] };
    const consumption = new Map<string, Bucket>();
    const key = (i: string, l: string) => `${i}|${l}`;
    const ensure = (k: string) => {
      let b = consumption.get(k);
      if (!b) { b = { total: 0, recent: 0, monthBuckets: new Array(12).fill(0) }; consumption.set(k, b); }
      return b;
    };
    (issueLines || []).forEach((l: any) => {
      const doc: any = issueDocMap.get(l.document_id); if (!doc?.location_id) return;
      const b = ensure(key(l.item_id, doc.location_id));
      const qty = Number(l.quantity || 0); b.total += qty;
      const d = new Date(doc.document_date); b.monthBuckets[d.getMonth()] += qty;
      if (doc.document_date >= recentSinceStr) b.recent += qty;
    });
    (posLines || []).forEach((l: any) => {
      const r: any = posMap.get(l.receipt_id); if (!r?.location_id) return;
      const b = ensure(key(l.item_id, r.location_id));
      const qty = Number(l.quantity || 0); b.total += qty;
      const d = new Date(r.date); b.monthBuckets[d.getMonth()] += qty;
      if (r.date >= recentSinceStr) b.recent += qty;
    });

    const onOrder = new Map<string, number>();
    (poLines || []).forEach((l: any) => {
      const loc = poLocMap.get(l.order_id); if (!loc) return;
      const remaining = Number(l.quantity || 0) - Number(l.received_quantity || 0);
      if (remaining <= 0) return;
      const k = key(l.item_id, loc as string);
      onOrder.set(k, (onOrder.get(k) || 0) + remaining);
    });

    type Rec = {
      item_id: string; location_id: string; recommended: number; price: number;
      supplier_id: string | null; routing: 'supplier' | 'transfer';
      source_location_id: string | null; urgency: string;
      reasoning: string;
    };
    const recs: Rec[] = [];

    for (const row of stockRows || []) {
      const item = (row as any).items;
      const loc = (row as any).locations;
      const k = key(row.item_id, row.location_id);
      const bucket = consumption.get(k) || { total: 0, recent: 0, monthBuckets: new Array(12).fill(0) };

      const avgDaily = bucket.total / HISTORY_DAYS;
      const recentDaily = bucket.recent / RECENT_DAYS;
      const monthlyAvg = bucket.total / 12;
      const seasonalityRaw = monthlyAvg > 0 ? bucket.monthBuckets[currentMonth] / monthlyAvg : 1;
      const seasonality = bucket.total > 0 ? Math.max(0.5, Math.min(2, seasonalityRaw || 1)) : 1;
      const trend = avgDaily > 0 ? Math.max(0.3, Math.min(3, recentDaily / avgDaily)) : (recentDaily > 0 ? 1.5 : 1);
      const promo = promoItems.get(row.item_id) || 1;
      const baselineDaily = Math.max(avgDaily, recentDaily);
      const adjusted = baselineDaily * seasonality * trend * promo;

      const safety = Math.max(Number(item.min_stock || 0), adjusted * Math.sqrt(DEFAULT_LEAD_TIME) * 1.65);
      const forecast = adjusted * (DEFAULT_LEAD_TIME + REVIEW_PERIOD_DAYS);
      const available = Number(row.quantity || 0) - Number(row.reserved_quantity || 0);
      const onOrd = onOrder.get(k) || 0;
      let recommended = forecast + safety - available - onOrd;
      if (Number(item.max_stock || 0) > 0) {
        recommended = Math.min(recommended, Number(item.max_stock) - available - onOrd);
      }
      recommended = Math.max(0, Math.ceil(recommended));
      if (recommended <= 0) continue;
      if (Number(item.min_stock || 0) === 0 && bucket.total === 0) continue;

      let urgency = 'low';
      if (available <= 0) urgency = 'critical';
      else if (available < safety) urgency = 'high';
      else urgency = 'normal';

      // Routing
      const isCentral = !!loc?.is_central || loc?.type === 'warehouse';
      let routing: 'supplier' | 'transfer' = 'supplier';
      let srcLoc: string | null = null;
      if (!isCentral) {
        const repSrc: string = item.replenishment_source || 'auto';
        const explicit: string | null = item.central_warehouse_location_id || null;
        const candidates = centralStockMap.get(row.item_id) || [];
        let chosen = explicit ? candidates.find((c) => c.location_id === explicit) || null : null;
        if (!chosen) chosen = candidates.filter((c) => c.available >= recommended * 0.5).sort((a, b) => b.available - a.available)[0] || null;
        if (repSrc === 'central_warehouse') { routing = 'transfer'; if (chosen) srcLoc = chosen.location_id; }
        else if (repSrc === 'auto' && chosen && chosen.available > 0) { routing = 'transfer'; srcLoc = chosen.location_id; }
      }

      recs.push({
        item_id: row.item_id, location_id: row.location_id,
        recommended, price: Number(item.purchase_price || 0),
        supplier_id: item.preferred_supplier_id || null,
        routing, source_location_id: srcLoc, urgency,
        reasoning: `auto: dnevno ${adjusted.toFixed(2)}, safety ${safety.toFixed(0)}, dostupno ${available.toFixed(0)}`,
      });
    }

    // Existing draft auto-runs to dedupe (skip items already drafted today)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const { data: existingPRs } = await supabase
      .from('purchase_requests').select('id, location_id, notes, created_at, purchase_request_lines(item_id)')
      .eq('status', 'draft').like('notes', '%Auto-replenishment%').gte('created_at', todayIso);
    const draftedSupplier = new Set<string>();
    (existingPRs || []).forEach((pr: any) => {
      (pr.purchase_request_lines || []).forEach((l: any) => draftedSupplier.add(`${l.item_id}|${pr.location_id}`));
    });
    const { data: existingTr } = await supabase
      .from('warehouse_documents').select('id, location_id, target_location_id, notes, created_at, warehouse_document_lines(item_id)')
      .eq('document_type', 'transfer').eq('status', 'draft').like('notes', '%Auto-replenishment%').gte('created_at', todayIso);
    const draftedTransfer = new Set<string>();
    (existingTr || []).forEach((d: any) => {
      (d.warehouse_document_lines || []).forEach((l: any) => draftedTransfer.add(`${l.item_id}|${d.target_location_id}`));
    });

    // Group supplier recs by (supplier, location)
    const supplierGroups = new Map<string, Rec[]>();
    const transferGroups = new Map<string, Rec[]>();
    for (const r of recs) {
      const dedupKey = `${r.item_id}|${r.location_id}`;
      if (r.routing === 'supplier') {
        if (draftedSupplier.has(dedupKey)) continue;
        const gk = `${r.supplier_id || 'none'}|${r.location_id}`;
        const arr = supplierGroups.get(gk) || []; arr.push(r); supplierGroups.set(gk, arr);
      } else if (r.source_location_id) {
        if (draftedTransfer.has(dedupKey)) continue;
        const gk = `${r.source_location_id}|${r.location_id}`;
        const arr = transferGroups.get(gk) || []; arr.push(r); transferGroups.set(gk, arr);
      }
    }

    let prCreated = 0, trCreated = 0;
    const year = new Date().getFullYear();

    // Create PRs
    const { count: prCount } = await supabase.from('purchase_requests').select('*', { count: 'exact', head: true });
    let prSeq = (prCount || 0);
    for (const [gk, lines] of supplierGroups.entries()) {
      const [supplierId, locationId] = gk.split('|');
      prSeq++;
      const reqNumber = `PR-${year}-${String(prSeq).padStart(5, '0')}`;
      const totalEst = lines.reduce((s, r) => s + r.recommended * r.price, 0);
      const { data: pr, error } = await supabase.from('purchase_requests').insert({
        request_number: reqNumber,
        partner_id: supplierId === 'none' ? null : supplierId,
        location_id: locationId, status: 'draft',
        priority: lines.some((l) => l.urgency === 'critical') ? 'high' : 'normal',
        notes: 'Auto-replenishment (cron)', total_estimated_value: totalEst,
      }).select('id').single();
      if (error) { console.error('PR insert', error); continue; }
      await supabase.from('purchase_request_lines').insert(lines.map((r) => ({
        request_id: pr.id, item_id: r.item_id, quantity: r.recommended,
        estimated_unit_price: r.price, estimated_total: r.recommended * r.price, notes: r.reasoning,
      })));
      prCreated++;
    }

    // Create transfers
    const { count: trCount } = await supabase
      .from('warehouse_documents').select('*', { count: 'exact', head: true }).eq('document_type', 'transfer');
    let trSeq = (trCount || 0);
    for (const [gk, lines] of transferGroups.entries()) {
      const [src, tgt] = gk.split('|');
      trSeq++;
      const docNumber = `TR-${year}-${String(trSeq).padStart(5, '0')}`;
      const totalValue = lines.reduce((s, r) => s + r.recommended * r.price, 0);
      const { data: doc, error } = await supabase.from('warehouse_documents').insert({
        document_type: 'transfer', document_number: docNumber,
        location_id: src, target_location_id: tgt, status: 'draft',
        notes: 'Auto-replenishment (cron)', total_value: totalValue,
      }).select('id').single();
      if (error) { console.error('TR insert', error); continue; }
      await supabase.from('warehouse_document_lines').insert(lines.map((r) => ({
        document_id: doc.id, item_id: r.item_id, quantity: r.recommended,
        unit_price: r.price, total_price: r.recommended * r.price,
      })));
      trCreated++;
    }

    await supabase.from('replenishment_runs').insert({
      triggered_by: triggeredBy,
      total_suggestions: recs.length,
      po_drafts_created: prCreated,
      transfer_drafts_created: trCreated,
    });

    return new Response(JSON.stringify({
      ok: true, total_suggestions: recs.length, pr_created: prCreated, transfer_created: trCreated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('auto-replenishment error', e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
