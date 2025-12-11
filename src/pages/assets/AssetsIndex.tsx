import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  HardDrive,
  Car,
  Laptop,
  Sofa,
  Plus,
  Search,
  TrendingDown,
  Building,
} from "lucide-react";

const assets = [
  { id: "FA-001", name: "Dell Latitude 5520", category: "IT Equipment", location: "Office HQ", custodian: "John Doe", purchaseValue: 1200, currentValue: 960, status: "active" },
  { id: "FA-002", name: "VW Transporter T6", category: "Vehicles", location: "Garage", custodian: "Mike Smith", purchaseValue: 35000, currentValue: 28000, status: "active" },
  { id: "FA-003", name: "Executive Desk Set", category: "Furniture", location: "Office HQ", custodian: "Sarah Johnson", purchaseValue: 2500, currentValue: 2000, status: "active" },
  { id: "FA-004", name: "HP LaserJet Pro", category: "IT Equipment", location: "Store 1", custodian: "Ana Kovač", purchaseValue: 450, currentValue: 0, status: "written-off" },
  { id: "FA-005", name: "Server Rack + UPS", category: "IT Equipment", location: "Server Room", custodian: "IT Dept", purchaseValue: 8500, currentValue: 5100, status: "active" },
];

const categoryIcons: Record<string, any> = {
  "IT Equipment": Laptop,
  "Vehicles": Car,
  "Furniture": Sofa,
};

export default function AssetsIndex() {
  return (
    <div>
      <Header title="Fixed Assets" subtitle="Osnovna sredstva • Asset Management" />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Assets"
            value="156"
            change="12 categories"
            icon={HardDrive}
            iconColor="bg-module-assets/10 text-module-assets"
          />
          <StatCard
            title="Total Value"
            value="€245,680"
            change="Purchase value: €312,450"
            icon={Building}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Monthly Depreciation"
            value="€4,230"
            change="Next calculation: Feb 1"
            icon={TrendingDown}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Written Off"
            value="23"
            change="This year: 8"
            icon={HardDrive}
            iconColor="bg-muted text-muted-foreground"
          />
        </div>

        {/* Asset Registry */}
        <div className="module-card">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Asset Registry</h3>
              <p className="text-sm text-muted-foreground">Registar osnovnih sredstava</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search assets..." className="w-64 pl-9" />
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Custodian</th>
                  <th className="text-right">Purchase Value</th>
                  <th className="text-right">Current Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const CategoryIcon = categoryIcons[asset.category] || HardDrive;
                  return (
                    <tr key={asset.id} className="cursor-pointer">
                      <td className="font-medium">{asset.id}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                          {asset.name}
                        </div>
                      </td>
                      <td>
                        <span className="rounded bg-muted px-2 py-1 text-xs">{asset.category}</span>
                      </td>
                      <td>{asset.location}</td>
                      <td>{asset.custodian}</td>
                      <td className="text-right text-muted-foreground">€{asset.purchaseValue.toLocaleString()}</td>
                      <td className="text-right font-medium">€{asset.currentValue.toLocaleString()}</td>
                      <td>
                        {asset.status === "active" ? (
                          <span className="badge-success">Active</span>
                        ) : (
                          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Written Off</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
