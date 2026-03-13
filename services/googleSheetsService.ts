import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const SPREADSHEET_ID = '1cGmomn3kLikEwlwjKsKLEONOt2A3nFQI3jrVXsYqn70';

export interface SheetRow {
  tipoDePg: string;
  cirurgia: string;
  pagamento: string;
  dia: string;
  valor: string;
  cliente: string;
  status: string;
}

export const getSpreadsheetData = async (sheetName: string, accessToken?: string): Promise<any[][]> => {
  let token = accessToken;

  if (!token) {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    token = credential?.accessToken || undefined;
  }

  if (!token) throw new Error("Não foi possível obter acesso ao Google Sheets.");

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A4:G`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erro ao ler planilha: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.values || [];
};

export const addRowToSpreadsheet = async (sheetName: string, rowData: string[], accessToken?: string): Promise<void> => {
  let token = accessToken;

  if (!token) {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    token = credential?.accessToken || undefined;
  }

  if (!token) throw new Error("Não foi possível obter acesso ao Google Sheets.");

  // Find the first empty row in columns B-G (or just append)
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:G:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowData]
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erro ao adicionar linha: ${errorData.error?.message || response.statusText}`);
  }
};

export const getSheetNames = async (accessToken?: string): Promise<string[]> => {
  let token = accessToken;

  if (!token) {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    token = credential?.accessToken || undefined;
  }

  if (!token) throw new Error("Não foi possível obter acesso ao Google Sheets.");

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erro ao buscar nomes das abas: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.sheets.map((s: any) => s.properties.title);
};
