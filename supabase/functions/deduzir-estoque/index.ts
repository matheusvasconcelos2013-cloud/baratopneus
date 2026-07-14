import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, content-type",
};

interface DeduzirestoqueRequest {
  vendaId: number;
  lojaId: number;
  itens: Array<{
    produto_id: number;
    quantidade: number;
  }>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { vendaId, lojaId, itens }: DeduzirestoqueRequest = await req.json();

    // Validate input
    if (!vendaId || !lojaId || !itens || itens.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: vendaId, lojaId, itens",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service_role key (has full access)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process each item
    for (const item of itens) {
      const { produto_id, quantidade } = item;

      // 1. Get current stock
      const { data: estoqueAtual, error: fetchError } = await supabase
        .from("estoque_lojas")
        .select("quantidade")
        .eq("produto_id", produto_id)
        .eq("loja_id", lojaId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError; // PGRST116 = not found (expected)
      }

      const quantidadeAtual = estoqueAtual?.quantidade || 0;
      const novaQuantidade = quantidadeAtual - quantidade;

      // 2. Insert or Update estoque_lojas
      if (quantidadeAtual === 0) {
        // Insert new record
        const { error: insertError } = await supabase
          .from("estoque_lojas")
          .insert({
            produto_id,
            loja_id: lojaId,
            quantidade: -quantidade,
          });

        if (insertError) throw insertError;
      } else {
        // Update existing record
        const { error: updateError } = await supabase
          .from("estoque_lojas")
          .update({ quantidade: novaQuantidade })
          .eq("produto_id", produto_id)
          .eq("loja_id", lojaId);

        if (updateError) throw updateError;
      }

      // 3. Register movement for audit trail
      const { error: movError } = await supabase
        .from("movimentacao_estoque")
        .insert({
          produto_id,
          loja_id: lojaId,
          tipo: "Saída",
          quantidade,
          motivo: "Venda",
          referencia_id: vendaId,
        });

      if (movError) throw movError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Estoque detraído com sucesso",
        vendaId,
        lojaId,
        itensProcessados: itens.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in deduzir-estoque function:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});