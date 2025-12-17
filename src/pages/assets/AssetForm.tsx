import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addMonths, format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { useDeleteSafetyDevice, useSafetyDeviceByAsset, useUpsertSafetyDevice } from "@/hooks/useHSE";
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
  is_safety_device: z.boolean().default(false),
  device_type: z.string().optional(),
  inspection_interval_months: z.coerce.number().optional(),
  last_inspection_date: z.string().optional(),
  next_inspection_date: z.string().optional(),
  installation_date: z.string().optional(),
  manufacturer: z.string().optional(),
  serial_number: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.is_safety_device) {
    if (!data.device_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["device_type"],
        message: "Device type is required for safety devices",
      });
    }
    if (!data.inspection_interval_months) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inspection_interval_months"],
        message: "Inspection interval is required",
      });
    }
  }
  if (data.current_value > data.purchase_value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["current_value"],
      message: "Current value cannot exceed purchase value",
    });
  }
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
  const { data: safetyDevice } = useSafetyDeviceByAsset(id);
  const { data: locations } = useLocations();
  const { data: employees } = useEmployees();
  const createAsset = useCreateFixedAsset();
  const updateAsset = useUpdateFixedAsset();
  const upsertSafetyDevice = useUpsertSafetyDevice();
  const deleteSafetyDevice = useDeleteSafetyDevice();

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
      is_safety_device: false,
      device_type: "",
      inspection_interval_months: 12,
      last_inspection_date: "",
      next_inspection_date: "",
      installation_date: "",
      manufacturer: "",
      serial_number: "",
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
        is_safety_device: !!safetyDevice,
        device_type: safetyDevice?.device_type || "",
        inspection_interval_months: safetyDevice?.inspection_interval_months || 12,
        last_inspection_date: safetyDevice?.last_inspection_date || "",
        next_inspection_date: safetyDevice?.next_inspection_date || "",
        installation_date: safetyDevice?.installation_date || "",
        manufacturer: safetyDevice?.manufacturer || "",
        serial_number: safetyDevice?.serial_number || "",
      });
    }
  }, [asset, form, safetyDevice]);

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

      const savedAsset = isEdit
        ? await updateAsset.mutateAsync({ id, ...payload })
        : await createAsset.mutateAsync(payload);

      if (data.is_safety_device && savedAsset?.id) {
        const nextInspection =
          data.next_inspection_date ||
          (data.last_inspection_date && data.inspection_interval_months
            ? format(
                addMonths(new Date(data.last_inspection_date), data.inspection_interval_months),
                "yyyy-MM-dd",
              )
            : null);

        await upsertSafetyDevice.mutateAsync({
          asset_id: savedAsset.id,
          device_code: data.asset_code,
          device_type: data.device_type || "Safety Device",
          name: data.name,
          location_id: data.location_id || null,
          inspection_interval_months: data.inspection_interval_months || null,
          last_inspection_date: data.last_inspection_date || null,
          next_inspection_date: nextInspection,
          installation_date: data.installation_date || null,
          manufacturer: data.manufacturer || null,
          serial_number: data.serial_number || null,
          status: "active",
        });
      } else if (!data.is_safety_device && savedAsset?.id && safetyDevice?.asset_id) {
        await deleteSafetyDevice.mutateAsync(savedAsset.id);
      }

      toast({ title: isEdit ? "Asset updated successfully" : "Asset created successfully" });
      navigate("/assets");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: message,
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

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Safety device & inspections</p>
                    <p className="text-sm text-muted-foreground">
                      Dodaj intervale pregleda za uređaje poput vatrogasnih aparata
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="is_safety_device"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="m-0">Safety tracking</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("is_safety_device") && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="device_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vrsta uređaja</FormLabel>
                          <FormControl>
                            <Input placeholder="Fire Extinguisher" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inspection_interval_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interval pregleda (mjeseci)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_inspection_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zadnji pregled</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="next_inspection_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sljedeći pregled</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="installation_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Datum instalacije</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proizvođač</FormLabel>
                          <FormControl>
                            <Input placeholder="Dräger, MSA..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serijski broj</FormLabel>
                          <FormControl>
                            <Input placeholder="SN-12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

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
