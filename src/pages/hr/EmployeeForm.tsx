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
import { useHREmployee, useCreateEmployee, useUpdateEmployee, useDepartments } from "@/hooks/useHR";
import { useLocations } from "@/hooks/useMasterData";
import { ArrowLeft, Save } from "lucide-react";

const employeeSchema = z.object({
  employee_code: z.string().min(1, "Employee code is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  department_id: z.string().optional(),
  location_id: z.string().optional(),
  hire_date: z.string().optional(),
  jmbg: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean().default(true),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function EmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const { data: employee, isLoading } = useHREmployee(id);
  const { data: departments } = useDepartments();
  const { data: locations } = useLocations();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_code: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      position: "",
      department_id: "",
      location_id: "",
      hire_date: "",
      jmbg: "",
      address: "",
      active: true,
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || "",
        phone: employee.phone || "",
        position: employee.position || "",
        department_id: employee.department_id || "",
        location_id: employee.location_id || "",
        hire_date: employee.hire_date || "",
        jmbg: employee.jmbg || "",
        address: employee.address || "",
        active: employee.active ?? true,
      });
    }
  }, [employee, form]);

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      const payload = {
        employee_code: data.employee_code,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        department_id: data.department_id || null,
        location_id: data.location_id || null,
        hire_date: data.hire_date || null,
        jmbg: data.jmbg || null,
        address: data.address || null,
        active: data.active,
      };

      if (isEdit) {
        await updateEmployee.mutateAsync({ id, ...payload });
        toast({ title: "Employee updated successfully" });
      } else {
        await createEmployee.mutateAsync(payload);
        toast({ title: "Employee created successfully" });
      }
      navigate("/hr");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading && isEdit) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="p-6">Loading employee...</div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={isEdit ? "Edit Employee" : "New Employee"}
        subtitle={isEdit ? "Izmjena zaposlenika" : "Novi zaposlenik"}
      />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/hr")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to HR
        </Button>

        <div className="module-card max-w-3xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employee_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "true")}
                        value={field.value ? "true" : "false"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+387 61 123 456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Developer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
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
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jmbg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>JMBG (ID Number)</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Street, City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/hr")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {isEdit ? "Update" : "Create"} Employee
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
