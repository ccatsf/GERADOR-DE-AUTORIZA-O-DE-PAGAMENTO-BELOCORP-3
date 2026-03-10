
import { GoogleGenAI, Type } from "@google/genai";
import { PaymentAuthData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const parsePaymentText = async (rawText: string): Promise<Partial<PaymentAuthData>> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key não configurada.");
  }

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
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Falha ao analisar JSON da IA", e);
    return {};
  }
};
