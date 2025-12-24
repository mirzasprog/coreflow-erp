import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceAnalysisRequest {
  itemId: string;
  itemName: string;
  currentPrice: number;
  proposedPrice: number;
  purchasePrice: number;
  locationName?: string;
  competitorPrices?: { name: string; price: number }[];
  isWeekend?: boolean;
  isHoliday?: boolean;
  season?: string;
  promoType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body: PriceAnalysisRequest = await req.json();
    const {
      itemName,
      currentPrice,
      proposedPrice,
      purchasePrice,
      locationName,
      competitorPrices,
      isWeekend,
      isHoliday,
      season,
      promoType
    } = body;

    // Calculate margins
    const currentMargin = currentPrice > 0 ? ((currentPrice - purchasePrice) / currentPrice * 100) : 0;
    const proposedMargin = proposedPrice > 0 ? ((proposedPrice - purchasePrice) / proposedPrice * 100) : 0;
    const discountPercent = currentPrice > 0 ? ((currentPrice - proposedPrice) / currentPrice * 100) : 0;

    // Build context for AI
    let contextParts: string[] = [];
    
    contextParts.push(`Artikal: ${itemName}`);
    contextParts.push(`Nabavna cijena: ${purchasePrice.toFixed(2)} KM`);
    contextParts.push(`Trenutna prodajna cijena: ${currentPrice.toFixed(2)} KM (marža ${currentMargin.toFixed(1)}%)`);
    contextParts.push(`Predložena akcijska cijena: ${proposedPrice.toFixed(2)} KM (marža ${proposedMargin.toFixed(1)}%)`);
    contextParts.push(`Popust: ${discountPercent.toFixed(1)}%`);
    
    if (locationName) {
      contextParts.push(`Lokacija: ${locationName}`);
    }
    
    if (season) {
      const seasonNames: Record<string, string> = {
        'spring': 'Proljeće',
        'summer': 'Ljeto', 
        'autumn': 'Jesen',
        'winter': 'Zima'
      };
      contextParts.push(`Godišnje doba: ${seasonNames[season] || season}`);
    }
    
    if (isWeekend) {
      contextParts.push(`Vikend akcija: Da`);
    }
    
    if (isHoliday) {
      contextParts.push(`Praznična akcija: Da`);
    }
    
    if (promoType) {
      const promoTypes: Record<string, string> = {
        'discount': 'Popust',
        'bundle': 'Paket ponuda',
        'bogo': 'Kupi jedan dobij drugi',
        'seasonal': 'Sezonska akcija'
      };
      contextParts.push(`Tip promocije: ${promoTypes[promoType] || promoType}`);
    }
    
    if (competitorPrices && competitorPrices.length > 0) {
      const avgCompetitorPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
      contextParts.push(`\nCijene konkurencije:`);
      competitorPrices.forEach(c => {
        contextParts.push(`  - ${c.name}: ${c.price.toFixed(2)} KM`);
      });
      contextParts.push(`Prosječna cijena konkurencije: ${avgCompetitorPrice.toFixed(2)} KM`);
    }

    const systemPrompt = `Ti si AI asistent za analizu cijena u maloprodajnom poslovanju. Tvoj zadatak je analizirati predložene akcijske cijene i dati preporuku.

Kriteriji za dobru akcijsku cijenu:
1. Marža mora ostati pozitivna (iznad nabavne cijene)
2. Popust bi trebao biti između 5-30% za većinu artikala
3. Sezonski artikli mogu imati veće popuste (do 50%)
4. Vikend akcije obično imaju manje popuste (5-15%)
5. Praznične akcije mogu imati veće popuste (15-40%)
6. Cijena bi trebala biti konkurentna ako postoje podaci o konkurenciji
7. Marža ispod 10% je rizična osim za promet velikih količina

Odgovori u JSON formatu:
{
  "recommendation": "approve" | "adjust" | "reject",
  "suggestedPrice": number | null,
  "confidence": number (0-100),
  "reasoning": "string - kratko obrazloženje na bosanskom jeziku",
  "warnings": ["string"] | null,
  "tips": ["string"] | null
}`;

    const userPrompt = `Analiziraj sljedeću akcijsku cijenu i daj preporuku:

${contextParts.join('\n')}

Da li je predložena cijena dobra? Ako nije, predloži bolju cijenu.`;

    console.log('Sending price analysis request to AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Empty response from AI');
    }

    console.log('AI Response:', aiResponse);

    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return a default response
      analysis = {
        recommendation: proposedMargin >= 10 ? 'approve' : 'adjust',
        suggestedPrice: proposedMargin < 10 ? purchasePrice * 1.15 : null,
        confidence: 60,
        reasoning: proposedMargin >= 10 
          ? 'Cijena je prihvatljiva s adekvatnom maržom.'
          : 'Marža je preniska. Preporučuje se povećanje cijene.',
        warnings: proposedMargin < 5 ? ['Marža je ispod 5%!'] : null,
        tips: null
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-price function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});