import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase'; // Importe corrigido para a mesma pasta

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
  folderId?: string
): Promise<string> => {
  try {
    // 1. Configurar o Provedor do Google com permissão para o Drive
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file'); // Escopo necessário para salvar arquivos

    // 2. Abrir o popup de login para pegar o Token de Acesso (AccessToken)
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken; // Este é o token que o Drive aceita

    if (!token) throw new Error("Não foi possível obter o token de acesso do Google.");

    // 3. Configurar metadados do arquivo
    const metadata: DriveFile = {
      name: fileName,
      mimeType: fileContent.type || 'application/pdf',
      ...(folderId && { parents: [folderId] })
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', fileContent);

    // 4. Enviar para o Google Drive
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}` // Usando o AccessToken aqui
        },
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro no Drive: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Arquivo salvo no Google Drive:", data.id);
    return data.id;
  } catch (error) {
    console.error("❌ Erro ao fazer upload para Google Drive:", error);
    throw error;
  }
};

export const createFolderInDrive = async (folderName: string): Promise<string> => {
  try {
    // Repetir o processo de login para garantir que temos o token para criar a pasta
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
    console.error("❌ Erro ao criar pasta:", error);
    throw error;
  }
};
