import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFixedAsset, useCreateFixedAsset, useUpdateFixedAsset } from "@/hooks/useFixedAssets";
import { useLocations, useEmployees } from "@/hooks/useMasterData";
import { ArrowLeft, Save } from "lucide-react";

const assetSchema = z.object({
  asset_code: z.string().min(1, "Asset code is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  location_id: z.string().optional(),
  custodian_id: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_value: z.coerce.number().min(0).default(0),
  current_value: z.coerce.number().min(0).default(0),
  useful_life_years: z.coerce.number().min(1).default(5),
  depreciation_method: z.string().default("linear"),
  status: z.enum(["active", "sold", "written_off"]).default("active"),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

const CATEGORIES = [
  "IT Equipment",
  "Vehicles",
  "Furniture",
  "Machinery",
  "Office Equipment",
  "Buildings",
  "Land",
  "Other",
];

export default function AssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const { data: asset, isLoading: assetLoading } = useFixedAsset(id);
  const { data: locations } = useLocations();
  const { data: employees } = useEmployees();
  const createAsset = useCreateFixedAsset();
  const updateAsset = useUpdateFixedAsset();

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_code: "",
      name: "",
      category: "",
      location_id: "",
      custodian_id: "",
      purchase_date: "",
      purchase_value: 0,
      current_value: 0,
      useful_life_years: 5,
      depreciation_method: "linear",
      status: "active",
      notes: "",
    },
  });

  useEffect(() => {
    if (asset) {
      form.reset({
        asset_code: asset.asset_code,
        name: asset.name,
        category: asset.category || "",
        location_id: asset.location_id || "",
        custodian_id: asset.custodian_id || "",
        purchase_date: asset.purchase_date || "",
        purchase_value: Number(asset.purchase_value) || 0,
        current_value: Number(asset.current_value) || 0,
        useful_life_years: asset.useful_life_years || 5,
        depreciation_method: asset.depreciation_method || "linear",
        status: asset.status || "active",
        notes: asset.notes || "",
      });
    }
  }, [asset, form]);

  const onSubmit = async (data: AssetFormData) => {
    try {
      const payload = {
        asset_code: data.asset_code,
        name: data.name,
        category: data.category || null,
        location_id: data.location_id || null,
        custodian_id: data.custodian_id || null,
        purchase_date: data.purchase_date || null,
        purchase_value: data.purchase_value,
        current_value: data.current_value,
        useful_life_years: data.useful_life_years,
        depreciation_method: data.depreciation_method,
        status: data.status,
        notes: data.notes || null,
      };

      if (isEdit) {
        await updateAsset.mutateAsync({ id, ...payload });
        toast({ title: "Asset updated successfully" });
      } else {
        await createAsset.mutateAsync(payload);
        toast({ title: "Asset created successfully" });
      }
      navigate("/assets");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (assetLoading && isEdit) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="p-6">Loading asset...</div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={isEdit ? "Edit Asset" : "New Asset"}
        subtitle={isEdit ? "Izmjena osnovnog sredstva" : "Novo osnovno sredstvo"}
      />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/assets")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assets
        </Button>

        <div className="module-card max-w-3xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="asset_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="FA-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Asset name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="written_off">Written Off</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="custodian_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custodian</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select custodian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Value (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="current_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useful_life_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Useful Life (Years)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="depreciation_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depreciation Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="linear">Linear</SelectItem>
                          <SelectItem value="declining">Declining Balance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/assets")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAsset.isPending || updateAsset.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {isEdit ? "Update" : "Create"} Asset
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
