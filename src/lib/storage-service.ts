import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Nome do bucket para armazenar os recibos
const RECEIPTS_BUCKET = 'receipts';

/**
 * Inicializa o bucket de recibos no Supabase Storage
 */
export const initReceiptStorage = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase não está configurado');
    return false;
  }
  
  try {
    // Verificar se o bucket já existe
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      console.error('Erro ao listar buckets:', getBucketsError.message);
      return false;
    }
    
    // Se o bucket já existe, retornar sucesso
    if (buckets?.some(bucket => bucket.name === RECEIPTS_BUCKET)) {
      console.log('Bucket de recibos já existe');
      return true;
    }
    
    // Criar o bucket
    const { error: createBucketError } = await supabase.storage.createBucket(
      RECEIPTS_BUCKET,
      {
        public: true, // Alterado para public para facilitar acesso
        fileSizeLimit: 10485760, // 10MB
      }
    );
    
    if (createBucketError) {
      console.error('Erro ao criar bucket de recibos:', createBucketError.message);
      return false;
    }
    
    console.log('Bucket de recibos criado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar armazenamento de recibos:', error);
    return false;
  }
};

/**
 * Reduz o tamanho da imagem antes de fazer upload
 */
const reduceImageSize = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Se não for uma imagem, retornar o arquivo original
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas');
        
        // Definir tamanho máximo (1024x1024 é bom para dispositivos móveis)
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1024;

        // Redimensionar mantendo a proporção
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round(height * (MAX_SIZE / width));
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round(width * (MAX_SIZE / height));
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada no canvas
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter para blob com qualidade reduzida
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error('Falha ao converter canvas para blob');
              return resolve(file);
            }

            // Criar novo arquivo a partir do blob
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            console.log(`Imagem redimensionada: ${width}x${height}, tamanho: ${(newFile.size / 1024).toFixed(1)}KB`);
            resolve(newFile);
          },
          'image/jpeg',
          0.7 // Qualidade 70%
        );
      };

      img.onerror = () => {
        console.error('Erro ao carregar imagem para reduzir tamanho');
        resolve(file);
      };
    };

    reader.onerror = () => {
      console.error('Erro ao ler arquivo para reduzir tamanho');
      resolve(file);
    };
  });
};

/**
 * Faz upload de uma imagem para o Supabase Storage
 */
export const uploadReceipt = async (file: File): Promise<string | null> => {
  if (!supabase) {
    console.error('Supabase não está configurado');
    return null;
  }
  
  try {
    console.log(`Iniciando processamento de recibo. Tamanho original: ${(file.size / 1024).toFixed(1)}KB`);
    
    // Reduzir o tamanho da imagem
    const optimizedFile = await reduceImageSize(file);
    console.log(`Imagem processada. Tamanho final: ${(optimizedFile.size / 1024).toFixed(1)}KB`);
    
    // Gerar um nome único para o arquivo
    const fileExt = file.type.startsWith('image/') ? 'jpg' : (file.name.split('.').pop() || 'jpg');
    const fileName = `${uuidv4()}.${fileExt}`;
    
    console.log(`Enviando arquivo para Supabase: ${fileName}`);
    
    // Fazer upload do arquivo
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(fileName, optimizedFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Erro ao fazer upload do recibo:', error.message);
      return null;
    }
    
    console.log('Upload realizado com sucesso. Obtendo URL pública...');
    
    // Obter a URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from(RECEIPTS_BUCKET)
      .getPublicUrl(fileName);
    
    console.log('URL pública obtida:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Erro durante o processo de upload:', error);
    return null;
  }
};

/**
 * Remove uma imagem do Supabase Storage
 */
export const deleteReceipt = async (url: string): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase não está configurado');
    return false;
  }
  
  try {
    // Extrair o nome do arquivo da URL
    const fileName = url.split('/').pop();
    
    if (!fileName) {
      console.error('Nome de arquivo inválido:', url);
      return false;
    }
    
    console.log('Removendo recibo:', fileName);
    
    // Remover o arquivo
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .remove([fileName]);
    
    if (error) {
      console.error('Erro ao remover recibo:', error.message);
      return false;
    }
    
    console.log('Recibo removido com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao remover recibo:', error);
    return false;
  }
}; 