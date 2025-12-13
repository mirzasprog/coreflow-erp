import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardList, BarChart3, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const stockItems = [
  { id: "1", code: "ART-001", name: "Office Chair Ergonomic", category: "Furniture", warehouse: "Main Warehouse", qty: 45, minQty: 10, unit: "pcs", value: 125.00 },
  { id: "2", code: "ART-002", name: "LED Monitor 27\"", category: "Electronics", warehouse: "Main Warehouse", qty: 8, minQty: 15, unit: "pcs", value: 320.00 },
  { id: "3", code: "ART-003", name: "Paper A4 500 sheets", category: "Office Supplies", warehouse: "Store 1", qty: 250, minQty: 50, unit: "pkg", value: 4.50 },
  { id: "4", code: "ART-004", name: "Printer Toner Black", category: "Office Supplies", warehouse: "Main Warehouse", qty: 12, minQty: 5, unit: "pcs", value: 85.00 },
  { id: "5", code: "ART-005", name: "Desk Standing 160x80", category: "Furniture", warehouse: "Store 2", qty: 3, minQty: 5, unit: "pcs", value: 450.00 },
];

const documentTypes = [
  { icon: ArrowDownToLine, label: "Goods Receipt", labelAlt: "Primka", href: "/warehouse/receipts", count: 24 },
  { icon: ArrowUpFromLine, label: "Goods Issue", labelAlt: "Otpremnica", href: "/warehouse/issues", count: 18 },
  { icon: ArrowLeftRight, label: "Transfer", labelAlt: "Međuskladišnica", href: "/warehouse/transfers", count: 7 },
  { icon: ClipboardList, label: "Inventory", labelAlt: "Inventura", href: "/warehouse/inventory", count: 2 },
  { icon: ShoppingCart, label: "Purchase Orders", labelAlt: "Narudžbenice", href: "/warehouse/purchase-orders", count: null },
  { icon: BarChart3, label: "Stock Report", labelAlt: "Izvještaj o zalihama", href: "/warehouse/stock-report", count: null },
];

export default function WarehouseIndex() {
  return (
    <div>
      <Header title="Warehouse" subtitle="Skladišno poslovanje • Inventory Management" />

      <div className="p-6">
        {/* Document Types Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {documentTypes.map((doc) => (
            <NavLink key={doc.href} to={doc.href}>
              <div className="module-card group cursor-pointer border-l-4 border-l-module-warehouse">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-module-warehouse/10 p-2">
                    <doc.icon className="h-5 w-5 text-module-warehouse" />
                  </div>
                  {doc.count !== null && (
                    <span className="text-2xl font-bold text-module-warehouse">{doc.count}</span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="font-medium">{doc.label}</p>
                  <p className="text-sm text-muted-foreground">{doc.labelAlt}</p>
                </div>
              </div>
            </NavLink>
          ))}
        </div>

        {/* Stock Overview */}
        <div className="module-card">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Stock Overview</h3>
              <p className="text-sm text-muted-foreground">Pregled zaliha</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search items..." className="w-64 pl-9" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  <SelectItem value="main">Main Warehouse</SelectItem>
                  <SelectItem value="store1">Store 1</SelectItem>
                  <SelectItem value="store2">Store 2</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Item
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Warehouse</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Min Qty</th>
                  <th>Status</th>
                  <th className="text-right">Unit Value</th>
                </tr>
              </thead>
              <tbody>
                {stockItems.map((item) => (
                  <tr key={item.id} className="cursor-pointer">
                    <td className="font-medium">{item.code}</td>
                    <td>{item.name}</td>
                    <td>
                      <span className="rounded bg-muted px-2 py-1 text-xs">{item.category}</span>
                    </td>
                    <td>{item.warehouse}</td>
                    <td className="text-right font-medium">{item.qty} {item.unit}</td>
                    <td className="text-right text-muted-foreground">{item.minQty}</td>
                    <td>
                      {item.qty <= item.minQty ? (
                        <span className="badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge-success">In Stock</span>
                      )}
                    </td>
                    <td className="text-right">€{item.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
