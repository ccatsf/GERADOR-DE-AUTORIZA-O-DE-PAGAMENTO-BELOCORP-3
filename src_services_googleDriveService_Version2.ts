console.log("Teste de Chave:", import.meta.env.VITE_GEMINI_API_KEY ? "OK" : "VAZIA");
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

const GOOGLE_DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface DriveFile {
  name: string;
  mimeType: string;
  parents?: string[];
}

export const uploadFileToDrive = async (
  fileName: string,
  fileContent: Blob,
  folderId?: string,
  accessToken?: string
): Promise<string> => {
  try {
    let token = accessToken;

    if (!token) {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      token = credential?.accessToken || undefined;
    }

    if (!token) throw new Error("Não foi possível obter o acesso ao Google Drive.");

    const metadata = {
      name: fileName,
      mimeType: fileContent.type || 'application/pdf',
      ...(folderId && { parents: [folderId] })
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + (fileContent.type || 'application/pdf') + '\r\n\r\n';

    const body = new Blob([
      multipartRequestBody,
      fileContent,
      close_delim
    ], { type: 'multipart/related; boundary=' + boundary });

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: body
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro completo do Drive:", errorData);
      throw new Error(`Erro no Drive: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Arquivo salvo no Google Drive:", data.id);
    return data.id;
  } catch (error: any) {
    console.error("❌ Erro ao fazer upload para Google Drive:", error);
    // Melhorar a mensagem de erro para o usuário
    if (error.code === 'auth/popup-blocked') {
      throw new Error("O navegador bloqueou o pop-up de login. Por favor, habilite pop-ups para este site.");
    }
    throw error;
  }
};

export const createFolderInDrive = async (folderName: string): Promise<string> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) throw new Error("Usuário não autenticado no Google");

    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao criar pasta: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("❌ Erro ao criar pasta:", error);
    throw error;
  }
};

export const findOrCreateFolder = async (
  folderName: string,
  accessToken: string
): Promise<string> => {
  try {
    // 1. Search for the folder in the root directory
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error("Erro na busca de pasta:", errorData);
      throw new Error(`Erro ao buscar pasta: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      // Folder found, return its ID
      console.log(`Pasta '${folderName}' encontrada com ID:`, searchData.files[0].id);
      return searchData.files[0].id;
    } else {
      // 2. Folder not found, create it
      console.log(`Pasta '${folderName}' não encontrada. Criando...`);
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error("Erro na criação de pasta:", errorData);
        throw new Error(`Erro ao criar pasta: ${createResponse.statusText}`);
      }

      const createData = await createResponse.json();
      console.log(`Pasta '${folderName}' criada com ID:`, createData.id);
      return createData.id;
    }
  } catch (error) {
    console.error(`❌ Erro ao encontrar ou criar pasta '${folderName}':`, error);
    throw error;
  }
};
