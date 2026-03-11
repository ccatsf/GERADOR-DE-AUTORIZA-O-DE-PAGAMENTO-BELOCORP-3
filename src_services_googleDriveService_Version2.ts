import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

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
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    // Obter token do usuário
    const token = await user.getIdToken();

    // Criar metadados do arquivo
    const metadata: DriveFile = {
      name: fileName,
      mimeType: fileContent.type || 'application/pdf',
      ...(folderId && { parents: [folderId] })
    };

    // Criar FormData
    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', fileContent);

    // Upload para Google Drive
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao fazer upload: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Arquivo salvo no Google Drive:", data.id);
    return data.id; // Retorna o ID do arquivo
  } catch (error) {
    console.error("❌ Erro ao fazer upload para Google Drive:", error);
    throw error;
  }
};

export const createFolderInDrive = async (folderName: string): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const token = await user.getIdToken();

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
    console.log("✅ Pasta criada no Google Drive:", data.id);
    return data.id;
  } catch (error) {
    console.error("❌ Erro ao criar pasta:", error);
    throw error;
  }
};