import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  HardDrive,
  Car,
  Laptop,
  Sofa,
  Plus,
  Search,
  TrendingDown,
  Building,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useFixedAssets, useAssetStats } from "@/hooks/useFixedAssets";

const categoryIcons: Record<string, any> = {
  "IT Equipment": Laptop,
  "Vehicles": Car,
  "Furniture": Sofa,
  "Machinery": Wrench,
  "Office Equipment": HardDrive,
};

export default function AssetsIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: assets, isLoading } = useFixedAssets();
  const { data: stats } = useAssetStats();

  const filteredAssets = assets?.filter(
    (asset) =>
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.asset_code.toLowerCase().includes(search.toLowerCase()) ||
      asset.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Fixed Assets" subtitle="Osnovna sredstva • Asset Management" />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Assets"
            value={stats?.totalAssets.toString() || "0"}
            change={`${stats?.activeAssets || 0} active`}
            icon={HardDrive}
            iconColor="bg-module-assets/10 text-module-assets"
          />
          <StatCard
            title="Total Value"
            value={`€${(stats?.totalCurrentValue || 0).toLocaleString()}`}
            change={`Purchase: €${(stats?.totalPurchaseValue || 0).toLocaleString()}`}
            icon={Building}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Total Depreciation"
            value={`€${(stats?.totalDepreciation || 0).toLocaleString()}`}
            change="Accumulated"
            icon={TrendingDown}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Written Off"
            value={stats?.writtenOffAssets.toString() || "0"}
            change="Assets retired"
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
                <Input
                  placeholder="Search assets..."
                  className="w-64 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={() => navigate("/assets/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading assets...</div>
          ) : !filteredAssets?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              {search ? "No assets match your search." : "No assets registered yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Custodian</TableHead>
                    <TableHead className="text-right">Purchase Value</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => {
                    const CategoryIcon = categoryIcons[asset.category || ""] || HardDrive;
                    return (
                      <TableRow
                        key={asset.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <TableCell className="font-medium">{asset.asset_code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            {asset.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {asset.category && (
                            <span className="rounded bg-muted px-2 py-1 text-xs">
                              {asset.category}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{asset.locations?.name || "—"}</TableCell>
                        <TableCell>
                          {asset.employees
                            ? `${asset.employees.first_name} ${asset.employees.last_name}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          €{Number(asset.purchase_value || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{Number(asset.current_value || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {asset.status === "active" ? (
                            <Badge variant="default">Active</Badge>
                          ) : asset.status === "sold" ? (
                            <Badge variant="secondary">Sold</Badge>
                          ) : (
                            <Badge variant="outline">Written Off</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
