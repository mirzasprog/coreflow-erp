import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown, AlertTriangle, Layers, Package } from "lucide-react";

interface TreeNode {
  bomId: string | null;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  isSubAssembly: boolean;
  isCycle?: boolean;
  depth: number;
  children: TreeNode[];
}

interface AggregatedMaterial {
  itemId: string;
  itemCode: string;
  itemName: string;
  totalQuantity: number;
}

interface Props {
  bomId?: string | null;
  productItemId?: string;
  multiplier?: number; // planned quantity
}

export function BomTreeView({ bomId, productItemId, multiplier = 1 }: Props) {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [aggregated, setAggregated] = useState<AggregatedMaterial[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function build() {
      setLoading(true);
      const w: string[] = [];
      const agg = new Map<string, AggregatedMaterial>();

      async function loadBomById(id: string) {
        const { data } = await supabase
          .from('production_boms')
          .select('id, output_quantity, product_item_id, items:product_item_id(code, name)')
          .eq('id', id)
          .maybeSingle();
        return data as any;
      }
      async function loadActiveBomForProduct(itemId: string) {
        const { data } = await supabase
          .from('production_boms')
          .select('id, output_quantity, product_item_id')
          .eq('product_item_id', itemId)
          .eq('active', true)
          .maybeSingle();
        return data as any;
      }
      async function loadItem(itemId: string) {
        const { data } = await supabase
          .from('items')
          .select('id, code, name')
          .eq('id', itemId)
          .maybeSingle();
        return data as any;
      }
      async function loadBomItems(bId: string) {
        const { data } = await supabase
          .from('production_bom_items')
          .select('component_item_id, quantity, items:component_item_id(code, name)')
          .eq('bom_id', bId);
        return (data || []) as any[];
      }

      async function expand(bId: string, qty: number, depth: number, ancestors: Set<string>): Promise<TreeNode[]> {
        if (depth > 10) {
          w.push(`Maksimalna dubina (10) prekoračena na razini ${depth}`);
          return [];
        }
        const bom = await loadBomById(bId);
        if (!bom) return [];
        const factor = qty / Number(bom.output_quantity || 1);
        const lines = await loadBomItems(bId);
        const nodes: TreeNode[] = [];
        for (const line of lines) {
          const requiredQty = Number(line.quantity) * factor;
          const subBom = await loadActiveBomForProduct(line.component_item_id);
          const isCycle = ancestors.has(line.component_item_id);
          if (isCycle) {
            w.push(`Kružna referenca: artikl ${line.items?.code} već je u stablu`);
          }
          const node: TreeNode = {
            bomId: subBom?.id || null,
            itemId: line.component_item_id,
            itemCode: line.items?.code || '',
            itemName: line.items?.name || '',
            quantity: requiredQty,
            isSubAssembly: !!subBom && !isCycle,
            isCycle,
            depth,
            children: [],
          };
          if (subBom && !isCycle) {
            const next = new Set(ancestors);
            next.add(line.component_item_id);
            node.children = await expand(subBom.id, requiredQty, depth + 1, next);
          } else {
            // leaf — accumulate
            const ex = agg.get(line.component_item_id);
            if (ex) ex.totalQuantity += requiredQty;
            else agg.set(line.component_item_id, {
              itemId: line.component_item_id,
              itemCode: line.items?.code || '',
              itemName: line.items?.name || '',
              totalQuantity: requiredQty,
            });
          }
          nodes.push(node);
        }
        return nodes;
      }

      let rootBomId = bomId;
      let rootItemId = productItemId;
      if (!rootBomId && rootItemId) {
        const b = await loadActiveBomForProduct(rootItemId);
        rootBomId = b?.id || null;
      }
      if (!rootBomId) {
        if (!cancelled) {
          setTree(null);
          setAggregated([]);
          setWarnings(['Nema aktivne sastavnice za prikaz']);
          setLoading(false);
        }
        return;
      }
      const bom = await loadBomById(rootBomId);
      if (!bom) {
        if (!cancelled) { setLoading(false); return; }
      }
      const productItem = await loadItem(bom.product_item_id);
      const ancestors = new Set<string>([bom.product_item_id]);
      const children = await expand(rootBomId, multiplier, 1, ancestors);
      const root: TreeNode = {
        bomId: rootBomId,
        itemId: bom.product_item_id,
        itemCode: productItem?.code || '',
        itemName: productItem?.name || '',
        quantity: multiplier,
        isSubAssembly: true,
        depth: 0,
        children,
      };

      if (!cancelled) {
        setTree(root);
        setAggregated(Array.from(agg.values()).sort((a, b) => a.itemCode.localeCompare(b.itemCode)));
        setWarnings(w);
        setExpanded(new Set([root.itemId]));
        setLoading(false);
      }
    }
    build();
    return () => { cancelled = true; };
  }, [bomId, productItemId, multiplier]);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const renderNode = (node: TreeNode, path: string) => {
    const key = `${path}/${node.itemId}`;
    const isOpen = expanded.has(key) || expanded.has(node.itemId);
    const hasChildren = node.children.length > 0;
    return (
      <div key={key} className="text-sm">
        <div
          className="flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded px-2 cursor-pointer"
          style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
          onClick={() => hasChildren && toggle(key)}
        >
          {hasChildren ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="w-4" />}
          {node.isSubAssembly ? <Layers className="h-4 w-4 text-primary" /> : <Package className="h-4 w-4 text-muted-foreground" />}
          <span className="font-mono text-xs text-muted-foreground">{node.itemCode}</span>
          <span className="flex-1">{node.itemName}</span>
          <Badge variant={node.isCycle ? "destructive" : node.isSubAssembly ? "default" : "secondary"}>
            {node.quantity.toFixed(3)}
          </Badge>
          {node.isCycle && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Cycle</Badge>}
          {node.isSubAssembly && !node.isCycle && <Badge variant="outline">L{node.depth + 1}</Badge>}
        </div>
        {isOpen && hasChildren && node.children.map(c => renderNode(c, key))}
      </div>
    );
  };

  if (loading) return <div className="p-4 text-muted-foreground text-sm">Učitavanje BOM stabla...</div>;
  if (!tree) return <div className="p-4 text-muted-foreground text-sm">{warnings[0] || 'Nema podataka'}</div>;

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Upozorenja ({warnings.length})</div>
            <ul className="list-disc pl-4 text-xs">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Višerazinsko BOM stablo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md p-2 max-h-96 overflow-auto">
            {renderNode(tree, 'root')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agregirani materijali (sirovine)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Šifra</TableHead><TableHead>Naziv</TableHead><TableHead className="text-right">Ukupna količina</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {aggregated.map(a => (
                <TableRow key={a.itemId}>
                  <TableCell className="font-mono text-xs">{a.itemCode}</TableCell>
                  <TableCell>{a.itemName}</TableCell>
                  <TableCell className="text-right font-medium">{a.totalQuantity.toFixed(3)}</TableCell>
                </TableRow>
              ))}
              {!aggregated.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nema sirovina</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
