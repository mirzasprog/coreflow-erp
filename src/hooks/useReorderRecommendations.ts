import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Advanced reorder recommendation engine.
 *
 * Combines: historical consumption (goods_issue + POS receipts), seasonality
 * (current month vs annual baseline), recent trend (last 30d vs prior 60d),
 * active promo activities (demand boost), turnover, min/max stock,
 * lead-time demand forecasting and safety stock.
 *
 * Output: per-item recommended order quantity with explanatory factors that
 * the user can override before generating purchase orders.
 */

export interface ReorderRecommendation {
  item_id: string;
  item_code: string;
  item_name: string;
  location_id: string;
  location_name: string;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  on_order_quantity: number;
  min_stock: number;
  max_stock: number;
  purchase_price: number;
  preferred_supplier_id: string | null;
  preferred_supplier_name: string | null;

  // Analytics
  avg_daily_demand: number;          // baseline (historical)
  recent_daily_demand: number;       // last 30 days
  seasonality_factor: number;        // current month vs annual avg (1 = neutral)
  trend_factor: number;              // recent vs baseline
  promo_factor: number;              // 1 + uplift if active promo
  turnover_days: number;             // days of cover at recent demand
  lead_time_days: number;
  safety_stock: number;
  forecast_demand: number;           // expected demand over lead time + review period
  recommended_quantity: number;      // suggested order qty (rounded)
  confidence: 'low' | 'medium' | 'high';
  reasoning: string[];
  has_active_promo: boolean;
  urgency: 'critical' | 'high' | 'normal' | 'low';

  // Routing
  location_type: string;
  routing: 'supplier' | 'transfer';
  source_location_id: string | null;
  source_location_name: string | null;
  source_available: number;
}

const DEFAULT_LEAD_TIME = 7;
const REVIEW_PERIOD_DAYS = 14; // cover demand until next review
const HISTORY_DAYS = 180;
const RECENT_DAYS = 30;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function useReorderRecommendations(locationId?: string) {
  return useQuery({
    queryKey: ['reorder-recommendations', locationId],
    queryFn: async (): Promise<ReorderRecommendation[]> => {
      const since = new Date();
      since.setDate(since.getDate() - HISTORY_DAYS);
      const sinceStr = since.toISOString().split('T')[0];
      const recentSince = new Date();
      recentSince.setDate(recentSince.getDate() - RECENT_DAYS);
      const recentSinceStr = recentSince.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();

      // 1. Stock with item + location
      let stockQuery = supabase
        .from('stock')
        .select(`
          item_id, location_id, quantity, reserved_quantity,
          items!inner(id, code, name, min_stock, max_stock, purchase_price, preferred_supplier_id, active, replenishment_source, central_warehouse_location_id),
          locations!inner(id, name, type, is_central)
        `)
        .eq('items.active', true);
      if (locationId) stockQuery = stockQuery.eq('location_id', locationId);
      const { data: stockRows, error: stockErr } = await stockQuery;
      if (stockErr) throw stockErr;

      const itemIds = Array.from(new Set((stockRows || []).map((s: any) => s.item_id)));
      if (itemIds.length === 0) return [];

      // Fetch all locations + central stock for routing decisions
      const { data: allLocations } = await supabase
        .from('locations')
        .select('id, name, type, is_central')
        .eq('active', true);
      const centralLocations = (allLocations || []).filter((l: any) => l.is_central || l.type === 'warehouse');
      const locationMeta = new Map<string, any>((allLocations || []).map((l: any) => [l.id, l]));

      // Fetch central-warehouse stock for items so we can route to transfers
      const centralLocIds = centralLocations.map((l: any) => l.id);
      let centralStock: any[] = [];
      if (centralLocIds.length) {
        const { data } = await supabase
          .from('stock')
          .select('item_id, location_id, quantity, reserved_quantity')
          .in('item_id', itemIds)
          .in('location_id', centralLocIds);
        centralStock = data || [];
      }
      const centralStockMap = new Map<string, { location_id: string; available: number }[]>();
      centralStock.forEach((s) => {
        const arr = centralStockMap.get(s.item_id) || [];
        arr.push({ location_id: s.location_id, available: Number(s.quantity || 0) - Number(s.reserved_quantity || 0) });
        centralStockMap.set(s.item_id, arr);
      });


      // 2. Historical consumption from goods_issue documents
      const { data: issueDocs } = await supabase
        .from('warehouse_documents')
        .select('id, document_date, location_id')
        .eq('document_type', 'goods_issue')
        .eq('status', 'posted')
        .gte('document_date', sinceStr);
      const issueDocMap = new Map((issueDocs || []).map((d: any) => [d.id, d]));
      const issueDocIds = (issueDocs || []).map((d: any) => d.id);

      let issueLines: any[] = [];
      if (issueDocIds.length) {
        const { data } = await supabase
          .from('warehouse_document_lines')
          .select('document_id, item_id, quantity')
          .in('document_id', issueDocIds)
          .in('item_id', itemIds);
        issueLines = data || [];
      }

      // 3. POS receipts for retail consumption
      const { data: posReceipts } = await supabase
        .from('pos_receipts')
        .select('id, receipt_date, terminal_id, pos_terminals(location_id)')
        .gte('receipt_date', sinceStr);
      const posMap = new Map(
        (posReceipts || []).map((r: any) => [r.id, { date: r.receipt_date, location_id: r.pos_terminals?.location_id }])
      );
      const posIds = (posReceipts || []).map((r: any) => r.id);
      let posLines: any[] = [];
      if (posIds.length) {
        const { data } = await supabase
          .from('pos_receipt_lines')
          .select('receipt_id, item_id, quantity')
          .in('receipt_id', posIds)
          .in('item_id', itemIds);
        posLines = data || [];
      }

      // 4. Open purchase orders (on-order qty)
      const { data: openPOs } = await supabase
        .from('purchase_orders')
        .select('id, location_id, status')
        .in('status', ['draft', 'submitted', 'ordered']);
      const openPOIds = (openPOs || []).map((p: any) => p.id);
      const poLocationMap = new Map((openPOs || []).map((p: any) => [p.id, p.location_id]));
      let openPOLines: any[] = [];
      if (openPOIds.length) {
        const { data } = await supabase
          .from('purchase_order_lines')
          .select('order_id, item_id, quantity, received_quantity')
          .in('order_id', openPOIds)
          .in('item_id', itemIds);
        openPOLines = data || [];
      }

      // 5. Active promo activities
      const { data: activePromos } = await supabase
        .from('promo_activities')
        .select('id, discount_percent, status, start_date, end_date, promo_items(item_id)')
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today);
      const promoItems = new Map<string, number>();
      (activePromos || []).forEach((p: any) => {
        const discount = Number(p.discount_percent || 0);
        // Higher discount → higher uplift (heuristic: 1 + discount/50, capped at 2x)
        const uplift = Math.min(2, 1 + discount / 50);
        (p.promo_items || []).forEach((pi: any) => {
          promoItems.set(pi.item_id, Math.max(promoItems.get(pi.item_id) || 1, uplift));
        });
      });

      // 6. Partners (preferred suppliers)
      const supplierIds = Array.from(
        new Set((stockRows || []).map((s: any) => s.items?.preferred_supplier_id).filter(Boolean))
      );
      let partnerMap = new Map<string, string>();
      if (supplierIds.length) {
        const { data } = await supabase.from('partners').select('id, name').in('id', supplierIds);
        (data || []).forEach((p: any) => partnerMap.set(p.id, p.name));
      }

      // 7. Aggregate consumption per (item, location)
      type Bucket = {
        total: number;
        recent: number;
        monthBuckets: number[]; // 12 months
      };
      const consumption = new Map<string, Bucket>();
      const key = (item: string, loc: string) => `${item}|${loc}`;
      const ensure = (k: string): Bucket => {
        let b = consumption.get(k);
        if (!b) {
          b = { total: 0, recent: 0, monthBuckets: new Array(12).fill(0) };
          consumption.set(k, b);
        }
        return b;
      };

      issueLines.forEach((l) => {
        const doc = issueDocMap.get(l.document_id) as any;
        if (!doc?.location_id) return;
        const k = key(l.item_id, doc.location_id);
        const b = ensure(k);
        const qty = Number(l.quantity || 0);
        b.total += qty;
        const d = new Date(doc.document_date);
        b.monthBuckets[d.getMonth()] += qty;
        if (doc.document_date >= recentSinceStr) b.recent += qty;
      });
      posLines.forEach((l) => {
        const r = posMap.get(l.receipt_id) as any;
        if (!r?.location_id) return;
        const k = key(l.item_id, r.location_id);
        const b = ensure(k);
        const qty = Number(l.quantity || 0);
        b.total += qty;
        const d = new Date(r.date);
        b.monthBuckets[d.getMonth()] += qty;
        if (r.date >= recentSinceStr) b.recent += qty;
      });

      // 8. On-order per (item, location)
      const onOrder = new Map<string, number>();
      openPOLines.forEach((l) => {
        const loc = poLocationMap.get(l.order_id);
        if (!loc) return;
        const remaining = Number(l.quantity || 0) - Number(l.received_quantity || 0);
        if (remaining <= 0) return;
        const k = key(l.item_id, loc);
        onOrder.set(k, (onOrder.get(k) || 0) + remaining);
      });

      // 9. Build recommendations
      const recs: ReorderRecommendation[] = [];
      for (const row of stockRows || []) {
        const item = (row as any).items;
        const loc = (row as any).locations;
        const k = key(row.item_id, row.location_id);
        const bucket = consumption.get(k) || { total: 0, recent: 0, monthBuckets: new Array(12).fill(0) };

        const avgDaily = bucket.total / HISTORY_DAYS;
        const recentDaily = bucket.recent / RECENT_DAYS;

        // Seasonality: current month consumption vs monthly average
        const monthlyAvg = bucket.total / 12;
        const seasonality = monthlyAvg > 0 ? bucket.monthBuckets[currentMonth] / monthlyAvg : 1;
        const seasonalityFactor = bucket.total > 0 ? Math.max(0.5, Math.min(2, seasonality || 1)) : 1;

        const trendFactor = avgDaily > 0 ? Math.max(0.3, Math.min(3, recentDaily / avgDaily)) : (recentDaily > 0 ? 1.5 : 1);
        const promoFactor = promoItems.get(row.item_id) || 1;

        const baselineDaily = Math.max(avgDaily, recentDaily);
        const adjustedDaily = baselineDaily * seasonalityFactor * trendFactor * promoFactor;

        const leadTime = DEFAULT_LEAD_TIME;
        const safetyStock = Math.max(
          Number(item.min_stock || 0),
          adjustedDaily * Math.sqrt(leadTime) * 1.65 // ~95% service level proxy
        );
        const forecastDemand = adjustedDaily * (leadTime + REVIEW_PERIOD_DAYS);

        const currentQty = Number(row.quantity || 0);
        const reserved = Number(row.reserved_quantity || 0);
        const available = currentQty - reserved;
        const onOrderQty = onOrder.get(k) || 0;

        let recommended = forecastDemand + safetyStock - available - onOrderQty;
        // Respect max_stock if defined
        if (Number(item.max_stock || 0) > 0) {
          const cap = Number(item.max_stock) - available - onOrderQty;
          recommended = Math.min(recommended, cap);
        }
        recommended = Math.max(0, recommended);

        const turnover = adjustedDaily > 0 ? available / adjustedDaily : Infinity;

        const reasoning: string[] = [];
        if (avgDaily > 0) reasoning.push(`Prosjek: ${round2(avgDaily)}/dan, zadnjih 30d: ${round2(recentDaily)}/dan`);
        if (seasonalityFactor !== 1) reasoning.push(`Sezonalnost: ${round2(seasonalityFactor)}x`);
        if (trendFactor !== 1) reasoning.push(`Trend: ${round2(trendFactor)}x`);
        if (promoFactor > 1) reasoning.push(`Aktivna promo akcija: +${Math.round((promoFactor - 1) * 100)}%`);
        if (Number(item.min_stock) > 0) reasoning.push(`Min zaliha: ${item.min_stock}`);
        if (onOrderQty > 0) reasoning.push(`Već naručeno: ${round2(onOrderQty)}`);
        if (Number.isFinite(turnover)) reasoning.push(`Pokrivenost: ~${Math.round(turnover)} dana`);

        let urgency: ReorderRecommendation['urgency'] = 'low';
        if (available <= 0) urgency = 'critical';
        else if (available < safetyStock) urgency = 'high';
        else if (recommended > 0) urgency = 'normal';

        const dataPoints = bucket.total;
        const confidence: ReorderRecommendation['confidence'] =
          dataPoints > 50 ? 'high' : dataPoints > 10 ? 'medium' : 'low';

        // Skip items with zero history AND adequate stock (no signal to reorder)
        if (recommended <= 0 && Number(item.min_stock || 0) === 0 && bucket.total === 0) continue;

        // ----- Routing decision: supplier vs transfer -----
        const locType = (loc?.type as string) || 'warehouse';
        const isCentralLoc = !!loc?.is_central || locType === 'warehouse';
        let routing: 'supplier' | 'transfer' = 'supplier';
        let sourceLocId: string | null = null;
        let sourceLocName: string | null = null;
        let sourceAvail = 0;

        if (!isCentralLoc) {
          // Determine if a central warehouse can supply this item
          const repSrc: string = item.replenishment_source || 'auto';
          const explicitCentral = item.central_warehouse_location_id as string | null;
          const candidates = centralStockMap.get(row.item_id) || [];
          let chosen: { location_id: string; available: number } | null = null;
          if (explicitCentral) {
            chosen = candidates.find((c) => c.location_id === explicitCentral) || null;
          }
          if (!chosen) {
            // pick central with most available stock
            chosen = candidates
              .filter((c) => c.available >= Math.ceil(recommended) * 0.5)
              .sort((a, b) => b.available - a.available)[0] || null;
          }
          if (repSrc === 'central_warehouse') {
            routing = 'transfer';
            if (chosen) {
              sourceLocId = chosen.location_id;
              sourceAvail = chosen.available;
            }
          } else if (repSrc === 'auto' && chosen && chosen.available > 0) {
            routing = 'transfer';
            sourceLocId = chosen.location_id;
            sourceAvail = chosen.available;
          }
          if (sourceLocId) sourceLocName = locationMeta.get(sourceLocId)?.name || null;
        }

        recs.push({
          item_id: row.item_id,
          item_code: item.code,
          item_name: item.name,
          location_id: row.location_id,
          location_name: loc?.name || '',
          current_quantity: currentQty,
          reserved_quantity: reserved,
          available_quantity: available,
          on_order_quantity: onOrderQty,
          min_stock: Number(item.min_stock || 0),
          max_stock: Number(item.max_stock || 0),
          purchase_price: Number(item.purchase_price || 0),
          preferred_supplier_id: item.preferred_supplier_id || null,
          preferred_supplier_name: item.preferred_supplier_id ? partnerMap.get(item.preferred_supplier_id) || null : null,
          avg_daily_demand: round2(avgDaily),
          recent_daily_demand: round2(recentDaily),
          seasonality_factor: round2(seasonalityFactor),
          trend_factor: round2(trendFactor),
          promo_factor: round2(promoFactor),
          turnover_days: Number.isFinite(turnover) ? Math.round(turnover) : 9999,
          lead_time_days: leadTime,
          safety_stock: round2(safetyStock),
          forecast_demand: round2(forecastDemand),
          recommended_quantity: Math.ceil(recommended),
          confidence,
          reasoning,
          has_active_promo: promoFactor > 1,
          urgency,
          location_type: locType,
          routing,
          source_location_id: sourceLocId,
          source_location_name: sourceLocName,
          source_available: sourceAvail,
        });
      }


      // Sort: critical first, then by recommended qty desc
      const urgencyRank = { critical: 0, high: 1, normal: 2, low: 3 };
      recs.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || b.recommended_quantity - a.recommended_quantity);

      return recs;
    },
  });
}
