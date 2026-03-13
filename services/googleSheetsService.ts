import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

const SPREADSHEET_ID = '1cGmomn3kLikEwlwjKsKLEONOt2A3nFQI3jrVXsyqn70';

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
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A4:G500`,
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

  // 1. Primeiro, buscamos as abas para obter o ID da aba atual (sheetId)
  const spreadsheetResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  let sheetId = 0;
  if (spreadsheetResponse.ok) {
    const data = await spreadsheetResponse.json();
    const sheet = data.sheets.find((s: any) => s.properties.title === sheetName);
    if (sheet) sheetId = sheet.properties.sheetId;
  }

  // 2. Buscamos os dados atuais para encontrar onde inserir a nova linha
  const getResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A4:G500`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  let insertRowIndex = 4;
  if (getResponse.ok) {
    const data = await getResponse.json();
    const values = data.values || [];
    const paymentDateToMatch = rowData[2];
    let lastMatchingDateIndex = -1;
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][2] === paymentDateToMatch) {
        lastMatchingDateIndex = i;
      }
    }

    if (lastMatchingDateIndex !== -1) {
      insertRowIndex = 4 + lastMatchingDateIndex + 1;
    } else {
      insertRowIndex = 4 + values.length;
    }
  }

  // 3. Adicionamos uma nova linha física na planilha (Shift down)
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: insertRowIndex - 1,
                endIndex: insertRowIndex
              },
              inheritFromBefore: true
            }
          }
        ]
      })
    }
  );

  // 4. Preenchemos os dados na nova linha criada
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A${insertRowIndex}:G${insertRowIndex}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
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
    throw new Error(`Erro ao preencher dados: ${errorData.error?.message || response.statusText}`);
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
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
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
  if (!data.sheets) return [];
  return data.sheets.map((s: any) => s.properties.title);
};

export const countActiveClients = async (sheetName: string, accessToken?: string): Promise<number> => {
  let token = accessToken;

  if (!token) {
    // Se não tiver token, não tenta logar automaticamente para não bloquear popup.
    // Retorna 0 ou lança erro silencioso.
    console.warn("Token não fornecido para contagem de clientes.");
    return 0;
  }

  // Busca coluna A (Tipo de PG)
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A4:A500`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    console.error("Erro ao buscar dados para contagem de clientes");
    return 0;
  }

  const data = await response.json();
  const values = data.values || [];
  
  // Conta quantos são "PAGAMENTO" ou "QUITAÇÃO" (case insensitive)
  let count = 0;
  values.forEach((row: any[]) => {
    if (row[0]) {
      const type = row[0].toString().toUpperCase().trim();
      if (type === 'PAGAMENTO' || type === 'QUITAÇÃO' || type === 'QUITACAO') {
        count++;
      }
    }
  });

  return count;
};

