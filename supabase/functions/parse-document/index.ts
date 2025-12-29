import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Helper function to convert ArrayBuffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// Helper function to extract text from document buffers
async function extractTextFromDocument(buffer: ArrayBuffer, fileExt: string): Promise<string> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  
  try {
    // For DOCX files, try to extract text from the XML content
    if (fileExt === 'docx') {
      // DOCX is a ZIP file containing XML
      // We'll try to find readable text patterns
      const bytes = new Uint8Array(buffer);
      const text = decoder.decode(bytes);
      
      // Look for text content between XML tags
      const textMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (textMatches && textMatches.length > 0) {
        const extractedTexts = textMatches.map(match => {
          const content = match.replace(/<[^>]+>/g, '');
          return content;
        });
        return extractedTexts.join(' ').replace(/\s+/g, ' ').trim();
      }
    }
    
    // For PDF files, try to find readable text
    if (fileExt === 'pdf') {
      const bytes = new Uint8Array(buffer);
      const text = decoder.decode(bytes);
      
      // Try to extract text between stream markers or parentheses (common in PDFs)
      const textParts: string[] = [];
      
      // Look for text in parentheses (common PDF text format)
      const parenMatches = text.match(/\(([^)]{2,})\)/g);
      if (parenMatches) {
        parenMatches.forEach(match => {
          const content = match.slice(1, -1);
          if (content.length > 2 && /[a-zA-ZčćžšđČĆŽŠĐ]/.test(content)) {
            textParts.push(content);
          }
        });
      }
      
      if (textParts.length > 10) {
        return textParts.join(' ').replace(/\s+/g, ' ').trim();
      }
    }
    
    // For Excel files, try basic extraction
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      const bytes = new Uint8Array(buffer);
      const text = decoder.decode(bytes);
      
      // Look for cell content in sharedStrings.xml
      const stringMatches = text.match(/<t[^>]*>([^<]+)<\/t>/g);
      if (stringMatches && stringMatches.length > 0) {
        const extractedTexts = stringMatches.map(match => {
          return match.replace(/<[^>]+>/g, '');
        });
        return extractedTexts.join(' | ').replace(/\s+/g, ' ').trim();
      }
    }
    
    return '';
  } catch (e) {
    console.error('Text extraction error:', e);
    return '';
  }
}

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
    
    console.log("Processing document:", filePath);
    
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
      console.error("Download error:", downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileName = filePath.split('/').pop() || '';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    
    console.log("File extension:", fileExt);
    
    let extractedText = '';

    // For text-based files, read directly
    if (['txt', 'md', 'csv'].includes(fileExt)) {
      extractedText = await fileData.text();
      console.log("Text file read, length:", extractedText.length);
    } 
    // For images only, use AI vision to extract content
    else if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      console.log("Image converted to base64, length:", base64.length);
      
      if (LOVABLE_API_KEY) {
        try {
          const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png'
          };

          console.log("Calling AI gateway for image text extraction...");

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
                  content: "Ti si asistent za ekstrakciju teksta iz slika. Izvuci sav relevantan tekstualni sadržaj. Opiši što vidiš i ekstrahiraj bilo koji tekst s slike. Odgovori na hrvatskom." 
                },
                { 
                  role: "user", 
                  content: [
                    {
                      type: "text",
                      text: `Izvuci sav tekstualni sadržaj iz ove slike (${fileName}). Opiši što vidiš.`
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeTypes[fileExt]};base64,${base64}`
                      }
                    }
                  ]
                }
              ],
            }),
          });

          console.log("AI response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            extractedText = data.choices?.[0]?.message?.content || '';
            console.log("AI extraction successful, text length:", extractedText.length);
          } else {
            const errorText = await response.text();
            console.error("AI gateway error:", response.status, errorText);
            extractedText = `[Slika: ${fileName}] - AI ekstrakcija nije uspjela. Molimo ručno opišite sadržaj.`;
          }
        } catch (aiError) {
          console.error('AI extraction failed:', aiError);
          extractedText = `[Slika: ${fileName}] - Automatska ekstrakcija nije uspjela. Molimo ručno opišite sadržaj.`;
        }
      } else {
        extractedText = `[Slika: ${fileName}] - API ključ nije dostupan za ekstrakciju.`;
      }
    }
    // For document files (PDF, Word, Excel), use Lovable document parser
    else if (['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(fileExt)) {
      console.log("Processing document file with Lovable parser...");
      
      try {
        // Get the public URL for the file
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('company-docs')
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (signedUrlError) {
          console.error("Failed to create signed URL:", signedUrlError);
          throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
        }

        const fileUrl = signedUrlData?.signedUrl;
        console.log("Document URL created for parsing");

        // Use Lovable AI to analyze the document content
        // First, read the file content directly
        const arrayBuffer = await fileData.arrayBuffer();
        const textContent = await extractTextFromDocument(arrayBuffer, fileExt);
        
        if (textContent && textContent.trim().length > 50) {
          extractedText = textContent;
          console.log("Direct text extraction successful, length:", extractedText.length);
        } else {
          // Fallback: Provide helpful message for manual entry
          extractedText = `[Dokument: ${fileName}]

Automatska ekstrakcija teksta za ovaj format (.${fileExt}) nije potpuno dostupna.

Molimo uredite ovaj dokument i ručno unesite sadržaj - to će omogućiti AI asistentu da koristi informacije iz dokumenta.

Savjet: Otvorite dokument, kopirajte tekst i zalijepite ga ovdje.`;
        }
      } catch (docError) {
        console.error("Document processing error:", docError);
        extractedText = `[Dokument: ${fileName}] - Molimo uredite i ručno unesite sadržaj dokumenta.`;
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

    console.log("Saving document to database...");

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
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save document: ${insertError.message}`);
    }

    console.log("Document saved successfully:", doc.id);

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
