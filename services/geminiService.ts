
import { GoogleGenAI, Type } from "@google/genai";
import { PaymentAuthData } from "../types";

export const parsePaymentText = async (rawText: string): Promise<Partial<PaymentAuthData>> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  if (!apiKey) {
    throw new Error("API Key não configurada. Verifique as variáveis de ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extraia as informações de autorização de pagamento do seguinte texto e retorne em formato JSON estruturado conforme o esquema fornecido. 
    Se encontrar nomes de médicos, atribua a 'doctorName'. Se houver menção a 'contrato aditivo' ou 'aditivo', tente determinar se é sim ou não para 'isContractAdditive'.
    Texto: "${rawText}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          clientName: { type: Type.STRING },
          clientCpf: { type: Type.STRING },
          contractNumber: { type: Type.STRING },
          totalAmount: { type: Type.STRING },
          doctorName: { type: Type.STRING },
          isContractAdditive: { type: Type.STRING, enum: ["sim", "nao"] },
          beneficiaries: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                pix: { type: Type.STRING },
                document: { type: Type.STRING },
                type: { type: Type.STRING },
                bank: { type: Type.STRING },
                agency: { type: Type.STRING },
                account: { type: Type.STRING },
                amount: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  try {
    const text = response.text || "{}";
    const parsed = JSON.parse(text.trim());
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.error("Falha ao analisar JSON da IA", e);
    return {};
  }
};

export const generateDailyQuote = async (): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  if (!apiKey) return "Foco, força e fé para conquistar seus objetivos hoje!";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere uma frase motivacional curta, inspiradora e levemente 'engraçadinha' ou 'fofa' para uma equipe administrativa de uma empresa chamada BELOCORP. A frase deve ser em português e ter no máximo 15 palavras. Não use aspas na resposta.",
    });
    return response.text?.trim() || "Foco, força e fé para conquistar seus objetivos hoje!";
  } catch (e) {
    console.error("Erro ao gerar frase do dia:", e);
    return "Foco, força e fé para conquistar seus objetivos hoje!";
  }
};
