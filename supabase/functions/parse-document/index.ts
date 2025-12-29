import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

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

// Helper function to extract text from DOCX files
function extractTextFromDocx(buffer: ArrayBuffer): string {
  try {
    const uint8Array = new Uint8Array(buffer);
    const unzipped = unzipSync(uint8Array);
    
    // Find document.xml which contains the main content
    const documentXml = unzipped['word/document.xml'];
    if (!documentXml) {
      console.log("document.xml not found in DOCX");
      return '';
    }
    
    const xmlContent = strFromU8(documentXml);
    console.log("DOCX XML content length:", xmlContent.length);
    
    // Extract text from <w:t> tags (Word text elements)
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (!textMatches || textMatches.length === 0) {
      console.log("No text matches found in DOCX");
      return '';
    }
    
    // Extract just the text content
    const texts: string[] = [];
    for (const match of textMatches) {
      const content = match.replace(/<w:t[^>]*>/g, '').replace(/<\/w:t>/g, '');
      if (content) {
        texts.push(content);
      }
    }
    
    // Join with spaces, but detect paragraph breaks
    let result = texts.join('');
    
    // Clean up extra whitespace
    result = result.replace(/\s+/g, ' ').trim();
    
    console.log("Extracted DOCX text length:", result.length);
    return result;
  } catch (e) {
    console.error('DOCX extraction error:', e);
    return '';
  }
}

// Helper function to extract text from XLSX files
function extractTextFromXlsx(buffer: ArrayBuffer): string {
  try {
    const uint8Array = new Uint8Array(buffer);
    const unzipped = unzipSync(uint8Array);
    
    // Find sharedStrings.xml which contains text content
    const sharedStrings = unzipped['xl/sharedStrings.xml'];
    if (!sharedStrings) {
      console.log("sharedStrings.xml not found in XLSX");
      return '';
    }
    
    const xmlContent = strFromU8(sharedStrings);
    console.log("XLSX sharedStrings length:", xmlContent.length);
    
    // Extract text from <t> tags
    const textMatches = xmlContent.match(/<t[^>]*>([^<]*)<\/t>/g);
    if (!textMatches || textMatches.length === 0) {
      console.log("No text matches found in XLSX");
      return '';
    }
    
    const texts: string[] = [];
    for (const match of textMatches) {
      const content = match.replace(/<t[^>]*>/g, '').replace(/<\/t>/g, '');
      if (content && content.trim()) {
        texts.push(content.trim());
      }
    }
    
    const result = texts.join(' | ');
    console.log("Extracted XLSX text length:", result.length);
    return result;
  } catch (e) {
    console.error('XLSX extraction error:', e);
    return '';
  }
}

// Helper function to extract text from PDF files (basic extraction)
function extractTextFromPdf(buffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const bytes = new Uint8Array(buffer);
    const text = decoder.decode(bytes);
    
    const textParts: string[] = [];
    
    // Look for text in parentheses (common PDF text format)
    const parenMatches = text.match(/\(([^)]{2,})\)/g);
    if (parenMatches) {
      for (const match of parenMatches) {
        const content = match.slice(1, -1);
        // Filter for readable text (letters present)
        if (content.length > 2 && /[a-zA-ZčćžšđČĆŽŠĐ0-9]/.test(content)) {
          // Decode PDF escape sequences
          const decoded = content
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
          textParts.push(decoded);
        }
      }
    }
    
    if (textParts.length > 5) {
      const result = textParts.join(' ').replace(/\s+/g, ' ').trim();
      console.log("Extracted PDF text length:", result.length);
      return result;
    }
    
    return '';
  } catch (e) {
    console.error('PDF extraction error:', e);
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
    // For images, use AI vision to extract content
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
    // For DOCX files, use proper ZIP extraction
    else if (fileExt === 'docx') {
      console.log("Processing DOCX file...");
      const arrayBuffer = await fileData.arrayBuffer();
      extractedText = extractTextFromDocx(arrayBuffer);
      
      if (!extractedText || extractedText.length < 20) {
        console.log("DOCX extraction failed or too short, falling back to message");
        extractedText = `[Dokument: ${fileName}] - Automatska ekstrakcija nije uspjela. Molimo uredite i ručno unesite sadržaj.`;
      }
    }
    // For XLSX files, use proper ZIP extraction
    else if (fileExt === 'xlsx') {
      console.log("Processing XLSX file...");
      const arrayBuffer = await fileData.arrayBuffer();
      extractedText = extractTextFromXlsx(arrayBuffer);
      
      if (!extractedText || extractedText.length < 10) {
        extractedText = `[Dokument: ${fileName}] - Automatska ekstrakcija nije uspjela. Molimo uredite i ručno unesite sadržaj.`;
      }
    }
    // For PDF files, try basic extraction
    else if (fileExt === 'pdf') {
      console.log("Processing PDF file...");
      const arrayBuffer = await fileData.arrayBuffer();
      extractedText = extractTextFromPdf(arrayBuffer);
      
      if (!extractedText || extractedText.length < 20) {
        extractedText = `[Dokument: ${fileName}] - PDF ekstrakcija nije potpuna. Molimo uredite i ručno unesite sadržaj.`;
      }
    }
    // For old DOC and XLS files
    else if (['doc', 'xls'].includes(fileExt)) {
      extractedText = `[Dokument: ${fileName}] - Stari format (.${fileExt}) nije podržan za automatsku ekstrakciju. Molimo pretvorite u noviji format (.docx, .xlsx) ili ručno unesite sadržaj.`;
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
