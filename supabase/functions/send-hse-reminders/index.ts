import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderPayload {
  medicalCheckIds?: string[];
  inspectionIds?: string[];
}

interface Employee {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface SafetyDevice {
  name: string | null;
  device_code: string;
  next_inspection_date: string | null;
}

interface MedicalCheck {
  id: string;
  check_date: string;
  valid_until: string | null;
  check_type: string;
  employees: Employee | null;
}

interface SafetyInspection {
  id: string;
  inspection_date: string;
  result: string | null;
  safety_devices: SafetyDevice | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { medicalCheckIds = [], inspectionIds = [] }: ReminderPayload = await req.json();

    if (!medicalCheckIds.length && !inspectionIds.length) {
      return new Response(
        JSON.stringify({ success: false, message: "No records provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const recipientSet = new Set<string>();
    const manualRecipients = Deno.env.get("HSE_NOTIFICATION_RECIPIENTS");
    if (manualRecipients) {
      manualRecipients.split(",").map((email) => email.trim()).filter(Boolean).forEach((email) => recipientSet.add(email));
    }

    const now = new Date();

    const { data: medicalChecksRaw } = medicalCheckIds.length
      ? await supabase
          .from("medical_checks")
          .select(`id, check_date, valid_until, check_type, employees!medical_checks_employee_id_fkey(first_name, last_name, email)`)
          .in("id", medicalCheckIds)
      : { data: [] };

    const { data: inspectionsRaw } = inspectionIds.length
      ? await supabase
          .from("safety_inspections")
          .select(`id, inspection_date, result, safety_devices!safety_inspections_device_id_fkey(name, device_code, next_inspection_date)`)
          .in("id", inspectionIds)
      : { data: [] };

    // Type cast and handle the joined data
    const medicalChecks: MedicalCheck[] = (medicalChecksRaw || []).map((check: Record<string, unknown>) => ({
      id: check.id as string,
      check_date: check.check_date as string,
      valid_until: check.valid_until as string | null,
      check_type: check.check_type as string,
      employees: check.employees as Employee | null,
    }));

    const inspections: SafetyInspection[] = (inspectionsRaw || []).map((insp: Record<string, unknown>) => ({
      id: insp.id as string,
      inspection_date: insp.inspection_date as string,
      result: insp.result as string | null,
      safety_devices: insp.safety_devices as SafetyDevice | null,
    }));

    medicalChecks.forEach((check) => {
      if (check.employees?.email) recipientSet.add(check.employees.email);
    });

    if (!recipientSet.size) {
      return new Response(
        JSON.stringify({ success: false, message: "No recipient emails available" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const medicalItems = medicalChecks.map((check) => {
      const validUntil = check.valid_until ? new Date(check.valid_until) : null;
      const daysRemaining = validUntil ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const status = daysRemaining === null ? "Bez datuma" : daysRemaining < 0 ? "Isteklo" : `Istječe za ${daysRemaining} dana`;
      const employeeName = `${check.employees?.first_name || ""} ${check.employees?.last_name || ""}`.trim() || "Zaposlenik";
      return `<li><strong>${employeeName}</strong> • ${check.check_type} • vrijedi do ${check.valid_until || "-"} (${status})</li>`;
    });

    const inspectionItems = inspections.map((inspection) => {
      const nextDate = inspection.safety_devices?.next_inspection_date
        ? new Date(inspection.safety_devices.next_inspection_date)
        : null;
      const daysRemaining = nextDate ? Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const status = daysRemaining === null ? "Bez termina" : daysRemaining < 0 ? "Isteklo" : `Za ${daysRemaining} dana`;
      return `<li><strong>${inspection.safety_devices?.name || inspection.safety_devices?.device_code || "Uređaj"}</strong> • posljednji pregled ${inspection.inspection_date} • sljedeći ${inspection.safety_devices?.next_inspection_date || "-"} (${status})</li>`;
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 16px;">
        <h2 style="color: #111827; margin-bottom: 8px;">HSE upozorenja o isteku</h2>
        <p style="color: #374151; margin-bottom: 16px;">Automatsko podsjećanje na preglede koji su istekli ili uskoro ističu.</p>

        ${medicalItems.length ? `
          <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <h3 style="margin-top: 0; color: #0ea5e9;">Liječnički pregledi</h3>
            <ul style="color: #111827; padding-left: 16px;">
              ${medicalItems.join("")}
            </ul>
          </div>
        ` : ""}

        ${inspectionItems.length ? `
          <div style="margin-bottom: 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <h3 style="margin-top: 0; color: #0ea5e9;">Pregledi uređaja</h3>
            <ul style="color: #111827; padding-left: 16px;">
              ${inspectionItems.join("")}
            </ul>
          </div>
        ` : ""}

        <p style="color: #6b7280; font-size: 12px;">Ova poruka je generirana automatski putem Coreflow ERP sustava.</p>
      </div>
    `;

    const to = Array.from(recipientSet);
    const emailResponse = await resend.emails.send({
      from: "HSE Podsjetnik <onboarding@resend.dev>",
      to,
      subject: "HSE upozorenja - isteci pregleda",
      html,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Podsjetnik poslan na ${to.join(", ")}`,
        emailId: emailResponse.data?.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
