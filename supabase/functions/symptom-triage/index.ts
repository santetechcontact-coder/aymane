import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Tu es un assistant médical d'orientation pour des PROFESSIONNELS DE SANTÉ en Afrique francophone.
À partir de symptômes décrits, tu produis une orientation structurée.
Tu n'établis JAMAIS de diagnostic définitif. Tu proposes des hypothèses, une spécialité de référence,
un niveau d'urgence et des examens initiaux à envisager.
Reste prudent : en cas de signes de gravité, le niveau d'urgence doit être "emergency".`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symptoms, age, sex, duration, history } = await req.json();
    if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Symptômes manquants ou trop courts." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const userPrompt = [
      `Symptômes: ${symptoms}`,
      age ? `Âge: ${age}` : null,
      sex ? `Sexe: ${sex}` : null,
      duration ? `Durée: ${duration}` : null,
      history ? `Antécédents / contexte: ${history}` : null,
    ].filter(Boolean).join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "orient_patient",
            description: "Retourne une orientation structurée à partir des symptômes.",
            parameters: {
              type: "object",
              properties: {
                urgency: { type: "string", enum: ["low", "moderate", "high", "emergency"], description: "Niveau d'urgence." },
                recommended_speciality: { type: "string", description: "Spécialité médicale recommandée (ex: Cardiologie, Médecine générale)." },
                consultation_mode: { type: "string", enum: ["self_care", "teleconsultation", "in_person", "home_visit", "emergency_room"] },
                summary: { type: "string", description: "Résumé clinique en 2-3 phrases." },
                differential: {
                  type: "array",
                  description: "Hypothèses différentielles, au plus 5.",
                  items: {
                    type: "object",
                    properties: {
                      condition: { type: "string" },
                      likelihood: { type: "string", enum: ["low", "medium", "high"] },
                      rationale: { type: "string" },
                    },
                    required: ["condition", "likelihood", "rationale"],
                    additionalProperties: false,
                  },
                },
                red_flags: { type: "array", items: { type: "string" }, description: "Signes de gravité à surveiller." },
                suggested_exams: { type: "array", items: { type: "string" }, description: "Examens complémentaires à envisager." },
                advice: { type: "string", description: "Conseils initiaux pour le professionnel." },
              },
              required: ["urgency", "recommended_speciality", "consultation_mode", "summary", "differential", "red_flags", "suggested_exams", "advice"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "orient_patient" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gateway error", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés sur l'espace de travail." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erreur du moteur IA." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Réponse IA invalide." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
