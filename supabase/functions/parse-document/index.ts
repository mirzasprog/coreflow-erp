import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, title, category, keywords } = await req.json();
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('company-docs')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileName = filePath.split('/').pop() || '';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    
    let extractedText = '';

    // For text-based files, read directly
    if (['txt', 'md', 'csv'].includes(fileExt)) {
      extractedText = await fileData.text();
    } 
    // For complex documents, use AI to extract/summarize content
    else if (['pdf', 'docx', 'doc', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'].includes(fileExt)) {
      // Convert file to base64 for AI processing
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Use AI to extract text content
      if (LOVABLE_API_KEY) {
        try {
          const mimeTypes: Record<string, string> = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png'
          };

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { 
                  role: "system", 
                  content: "Ti si asistent za ekstrakciju teksta iz dokumenata. Izvuci sav relevantan tekstualni sadržaj iz dokumenta. Ako je to slika, opiši što vidiš. Ako je tablica, strukturiraj podatke. Odgovori samo s ekstrahiranim sadržajem, bez dodatnih komentara." 
                },
                { 
                  role: "user", 
                  content: [
                    {
                      type: "text",
                      text: `Izvuci sav tekstualni sadržaj iz ovog dokumenta (${fileName}). Ako je riječ o pravilniku ili proceduri, zadrži strukturu i naslove.`
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeTypes[fileExt] || 'application/octet-stream'};base64,${base64}`
                      }
                    }
                  ]
                }
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            extractedText = data.choices?.[0]?.message?.content || '';
          }
        } catch (aiError) {
          console.error('AI extraction failed:', aiError);
          extractedText = `[Dokument: ${fileName}] - Automatska ekstrakcija nije uspjela. Molimo ručno unesite sadržaj.`;
        }
      }
    }

    // If no text was extracted, provide a placeholder
    if (!extractedText.trim()) {
      extractedText = `[Dokument: ${fileName}] - Sadržaj nije mogao biti automatski ekstrahiran.`;
    }

    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('company-docs')
      .getPublicUrl(filePath);

    // Save to company_documents table
    const { data: doc, error: insertError } = await supabase
      .from('company_documents')
      .insert({
        title: title || fileName,
        category: category || 'Opći dokumenti',
        content: extractedText,
        keywords: keywords || [],
        file_url: urlData?.publicUrl || null,
        file_type: fileExt,
        original_filename: fileName,
        active: true
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save document: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      document: doc,
      extractedLength: extractedText.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-document error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Nepoznata greška" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
