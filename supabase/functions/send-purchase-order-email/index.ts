import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseOrderEmailRequest {
  orderId: string;
}

interface OrderLine {
  quantity: number;
  unit_price: number;
  total_price: number;
  items: { code: string; name: string } | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send purchase order email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId }: PurchaseOrderEmailRequest = await req.json();
    console.log("Processing order ID:", orderId);

    // Fetch order with partner and lines
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        partners(name, code, email),
        locations(name, code)
      `)
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    if (!order) {
      throw new Error("Order not found");
    }

    // Fetch order lines
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select(`*, items(code, name)`)
      .eq("order_id", orderId);

    if (linesError) {
      console.error("Error fetching lines:", linesError);
      throw new Error(`Failed to fetch order lines: ${linesError.message}`);
    }

    const supplierEmail = order.partners?.email;
    const supplierName = order.partners?.name || "Supplier";

    if (!supplierEmail) {
      console.log("No supplier email configured for this order");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Supplier has no email configured" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build order lines HTML
    const linesHtml = (lines as OrderLine[])
      .map(
        (line) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${line.items?.code || "-"}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${line.items?.name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${line.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">€${line.unit_price.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">€${line.total_price.toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Purchase Order ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Purchase Order</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${order.order_number}</p>
        </div>
        
        <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Dear ${supplierName},</p>
          
          <p>Please find below our purchase order. We kindly request you to confirm receipt and expected delivery date.</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Order Date:</strong> ${order.order_date}</p>
            <p><strong>Expected Delivery:</strong> ${order.expected_date || "To be confirmed"}</p>
            <p><strong>Delivery Location:</strong> ${order.locations?.name || "Main Warehouse"}</p>
          </div>
          
          <h3>Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Code</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Qty</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Unit Price</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total:</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">€${(order.total_value || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ""}
          
          <p>Please confirm this order at your earliest convenience.</p>
          
          <p>Best regards,<br>Procurement Team</p>
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
          This is an automated email. Please do not reply directly to this email.
        </p>
      </body>
      </html>
    `;

    console.log("Sending email to:", supplierEmail);

    const emailResponse = await resend.emails.send({
      from: "Purchase Orders <onboarding@resend.dev>",
      to: [supplierEmail],
      subject: `Purchase Order ${order.order_number}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to ${supplierEmail}`,
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-purchase-order-email function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
