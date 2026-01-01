import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Zap, Calendar, Package, Clock, AlertTriangle } from 'lucide-react';
import { 
  usePriceRules, 
  useCreatePriceRule, 
  useUpdatePriceRule, 
  useDeletePriceRule,
  useAutoDiscountSuggestions,
  PriceRule,
  PriceRuleCondition,
  PriceRuleAction
} from '@/hooks/usePriceRules';
import { useItems } from '@/hooks/useMasterData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ruleTypes = [
  { value: 'day_of_week', label: 'Dan u sedmici', icon: Calendar },
  { value: 'stock_level', label: 'Nivo zaliha', icon: Package },
  { value: 'expiry_proximity', label: 'Rok trajanja', icon: AlertTriangle },
  { value: 'time_of_day', label: 'Vrijeme dana', icon: Clock },
  { value: 'combined', label: 'Kombinovano', icon: Zap }
];

const conditionTypes = [
  { value: 'day_of_week', label: 'Dan u sedmici' },
  { value: 'is_weekend', label: 'Vikend' },
  { value: 'stock_quantity', label: 'Količina na stanju' },
  { value: 'stock_percentage', label: 'Procenat zaliha' },
  { value: 'days_to_expiry', label: 'Dana do isteka' },
  { value: 'time_range', label: 'Vremenski interval' }
];

const operators = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'between', label: 'Između' }
];

const actionTypes = [
  { value: 'discount_percent', label: 'Popust (%)' },
  { value: 'discount_amount', label: 'Popust (KM)' },
  { value: 'set_price', label: 'Fiksna cijena' },
  { value: 'markup_percent', label: 'Marža (%)' }
];

const daysOfWeek = [
  { value: 0, label: 'Nedjelja' },
  { value: 1, label: 'Ponedjeljak' },
  { value: 2, label: 'Utorak' },
  { value: 3, label: 'Srijeda' },
  { value: 4, label: 'Četvrtak' },
  { value: 5, label: 'Petak' },
  { value: 6, label: 'Subota' }
];

export default function PriceRulesPage() {
  const { data: rules, isLoading } = usePriceRules();
  const { data: suggestions } = useAutoDiscountSuggestions();
  const { data: items } = useItems();
  const createRule = useCreatePriceRule();
  const updateRule = useUpdatePriceRule();
  const deleteRule = useDeletePriceRule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    rule_type: 'expiry_proximity' as PriceRule['rule_type'],
    priority: 10,
    active: true,
    valid_from: '',
    valid_to: '',
    conditions: [] as PriceRuleCondition[],
    action: {
      type: 'discount_percent',
      value: 10,
      max_discount_percent: 50,
      min_margin_percent: 5
    } as PriceRuleAction
  });

  const [newCondition, setNewCondition] = useState<Partial<PriceRuleCondition>>({
    type: 'days_to_expiry',
    operator: 'lte',
    value: 7
  });

  const openNewDialog = () => {
    setEditingRule(null);
    setFormData({
      code: `RULE-${Date.now().toString().slice(-6)}`,
      name: '',
      description: '',
      rule_type: 'expiry_proximity',
      priority: 10,
      active: true,
      valid_from: '',
      valid_to: '',
      conditions: [],
      action: {
        type: 'discount_percent',
        value: 10,
        max_discount_percent: 50,
        min_margin_percent: 5
      }
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: PriceRule) => {
    setEditingRule(rule);
    setFormData({
      code: rule.code,
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      priority: rule.priority,
      active: rule.active,
      valid_from: rule.valid_from || '',
      valid_to: rule.valid_to || '',
      conditions: rule.conditions || [],
      action: rule.action
    });
    setIsDialogOpen(true);
  };

  const addCondition = () => {
    if (!newCondition.type || !newCondition.operator) return;
    
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition as PriceRuleCondition]
    }));
    setNewCondition({ type: 'days_to_expiry', operator: 'lte', value: 7 });
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || formData.conditions.length === 0) {
      return;
    }

    const payload = {
      ...formData,
      valid_from: formData.valid_from || undefined,
      valid_to: formData.valid_to || undefined
    };

    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, ...payload });
    } else {
      await createRule.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteRule.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const getRuleTypeIcon = (type: string) => {
    const ruleType = ruleTypes.find(rt => rt.value === type);
    return ruleType ? <ruleType.icon className="h-4 w-4" /> : <Zap className="h-4 w-4" />;
  };

  const formatCondition = (condition: PriceRuleCondition) => {
    const condType = conditionTypes.find(ct => ct.value === condition.type);
    const op = operators.find(o => o.value === condition.operator);
    
    if (condition.type === 'day_of_week') {
      const days = Array.isArray(condition.value) ? condition.value : [condition.value];
      const dayNames = days.map(d => daysOfWeek.find(dw => dw.value === d)?.label).join(', ');
      return `${condType?.label}: ${dayNames}`;
    }
    
    if (condition.type === 'is_weekend') {
      return condition.value ? 'Vikend' : 'Radni dan';
    }
    
    return `${condType?.label} ${op?.label} ${condition.value}${condition.value2 ? ` - ${condition.value2}` : ''}`;
  };

  const formatAction = (action: PriceRuleAction) => {
    const actionType = actionTypes.find(at => at.value === action.type);
    if (action.type === 'discount_percent') return `-${action.value}%`;
    if (action.type === 'discount_amount') return `-${action.value} KM`;
    if (action.type === 'set_price') return `${action.value} KM`;
    if (action.type === 'markup_percent') return `+${action.value}% marža`;
    return `${actionType?.label}: ${action.value}`;
  };

  return (
    <div>
      <Header title="Pravila Cijena" subtitle="Automatizirana pravila za dinamičke cijene" />

      <div className="p-6 space-y-6">
        <div className="mb-4">
          <NavLink to="/pricing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Nazad na Upravljanje Cijenama
          </NavLink>
        </div>

        {/* Auto-Discount Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Preporučena Sniženja ({suggestions.length})
              </CardTitle>
              <CardDescription>
                Artikli kojima ističe rok trajanja - predloženi popusti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{item.items?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Ističe za {item.days_to_expiry} dana • LOT: {item.lot_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">-{item.suggested_discount}%</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.suggested_price?.toFixed(2)} KM
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rules List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Aktivna Pravila</CardTitle>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pravilo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Učitavanje...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pravilo</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Uslovi</TableHead>
                    <TableHead>Akcija</TableHead>
                    <TableHead>Prioritet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!rules?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nema definiranih pravila. Kreirajte prvo pravilo za automatsko upravljanje cijenama.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            <p className="text-xs text-muted-foreground">{rule.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRuleTypeIcon(rule.rule_type)}
                            <span className="text-sm">
                              {ruleTypes.find(rt => rt.value === rule.rule_type)?.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rule.conditions.slice(0, 2).map((cond, i) => (
                              <Badge key={i} variant="outline" className="text-xs mr-1">
                                {formatCondition(cond)}
                              </Badge>
                            ))}
                            {rule.conditions.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{rule.conditions.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{formatAction(rule.action)}</Badge>
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Badge variant={rule.active ? 'default' : 'secondary'}>
                            {rule.active ? 'Aktivno' : 'Neaktivno'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(rule)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Uredi Pravilo' : 'Novo Pravilo Cijena'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Šifra *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editingRule}
                />
              </div>
              <div>
                <Label>Tip pravila</Label>
                <Select 
                  value={formData.rule_type} 
                  onValueChange={(v) => setFormData({ ...formData, rule_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map(rt => (
                      <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Naziv *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Sniženje pred istek roka"
              />
            </div>

            <div>
              <Label>Opis</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Uslovi</Label>
              
              <div className="flex gap-2 flex-wrap items-end">
                <div>
                  <Label className="text-xs">Tip</Label>
                  <Select 
                    value={newCondition.type} 
                    onValueChange={(v) => setNewCondition({ ...newCondition, type: v as any })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionTypes.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {newCondition.type !== 'is_weekend' && newCondition.type !== 'day_of_week' && (
                  <>
                    <div>
                      <Label className="text-xs">Operator</Label>
                      <Select 
                        value={newCondition.operator} 
                        onValueChange={(v) => setNewCondition({ ...newCondition, operator: v as any })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map(op => (
                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Vrijednost</Label>
                      <Input
                        type="number"
                        className="w-24"
                        value={newCondition.value as number || ''}
                        onChange={(e) => setNewCondition({ ...newCondition, value: parseFloat(e.target.value) })}
                      />
                    </div>
                    {newCondition.operator === 'between' && (
                      <div>
                        <Label className="text-xs">Do</Label>
                        <Input
                          type="number"
                          className="w-24"
                          value={newCondition.value2 as number || ''}
                          onChange={(e) => setNewCondition({ ...newCondition, value2: parseFloat(e.target.value) })}
                        />
                      </div>
                    )}
                  </>
                )}
                
                {newCondition.type === 'is_weekend' && (
                  <div className="flex items-center gap-2 pb-2">
                    <Switch
                      checked={Boolean(newCondition.value)}
                      onCheckedChange={(checked) => setNewCondition({ ...newCondition, value: checked ? 1 : 0 })}
                    />
                    <span className="text-sm">Vikend</span>
                  </div>
                )}
                
                <Button size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.conditions.length > 0 && (
                <div className="space-y-2 border rounded-lg p-3">
                  {formData.conditions.map((cond, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <Badge variant="secondary">{formatCondition(cond)}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Akcija</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Tip akcije</Label>
                  <Select 
                    value={formData.action.type} 
                    onValueChange={(v) => setFormData({ 
                      ...formData, 
                      action: { ...formData.action, type: v as any } 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map(at => (
                        <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Vrijednost</Label>
                  <Input
                    type="number"
                    value={formData.action.value}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      action: { ...formData.action, value: parseFloat(e.target.value) || 0 } 
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Max popust (%)</Label>
                  <Input
                    type="number"
                    value={formData.action.max_discount_percent || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      action: { ...formData.action, max_discount_percent: parseFloat(e.target.value) || undefined } 
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Min marža (%)</Label>
                  <Input
                    type="number"
                    value={formData.action.min_margin_percent || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      action: { ...formData.action, min_margin_percent: parseFloat(e.target.value) || undefined } 
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Prioritet</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div>
                <Label>Važi od</Label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label>Važi do</Label>
                <Input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label>Aktivno</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Odustani</Button>
            <Button onClick={handleSave} disabled={createRule.isPending || updateRule.isPending}>
              {editingRule ? 'Sačuvaj' : 'Kreiraj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši pravilo?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija je nepovratna. Pravilo će biti trajno obrisano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Obriši</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
