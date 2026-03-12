import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

// Cache do token para não pedir toda hora
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// Função para obter token do Drive usando o usuário atual
export const getDriveToken = async (): Promise<string> => {
  // Se tiver token em cache e não expirou, usa ele
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("Usuário não está logado");
    }

    // Forçar reautenticação com escopo do Drive
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({
      prompt: 'consent' // Força pedir permissão novamente
    });

    // Usar o usuário atual para reautenticar
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error("Não foi possível obter token do Drive");
    }

    // Cache do token (expira em 3500 segundos ~ 1 hora)
    cachedToken = token;
    tokenExpiry = Date.now() + 3500 * 1000;

    return token;
  } catch (error) {
    console.error("Erro ao obter token do Drive:", error);
    throw error;
  }
};

// Função para verificar se já tem permissão
export const checkDrivePermission = async (): Promise<boolean> => {
  try {
    await getDriveToken();
    return true;
  } catch {
    return false;
  }
};

// Upload para o Drive (CORRIGIDO)
export const uploadFileToDrive = async (
  fileName: string,
  fileContent: Blob,
  folderId?: string
): Promise<string> => {
  try {
    // Pega o token (se não tiver, pede permissão)
    const token = await getDriveToken();

    const metadata = {
      name: fileName,
      mimeType: 'application/pdf',
      ...(folderId && { parents: [folderId] })
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', fileContent);

    console.log("🚀 Enviando para o Drive...");

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
      const errorData = await response.json();
      
      // Se for erro de autenticação, limpa cache e tenta de novo
      if (response.status === 401) {
        cachedToken = null;
        tokenExpiry = null;
        return uploadFileToDrive(fileName, fileContent, folderId);
      }
      
      throw new Error(errorData.error?.message || response.statusText);
    }

    const data = await response.json();
    console.log("✅ Arquivo salvo no Drive! ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("❌ Erro detalhado:", error);
    throw error;
  }
};

// Criar pasta (CORRIGIDO)
export const createFolderInDrive = async (folderName: string): Promise<string> => {
  try {
    const token = await getDriveToken();

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
      const error = await response.json();
      throw new Error(error.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error("❌ Erro ao criar pasta:", error);
    throw error;
  }
};
