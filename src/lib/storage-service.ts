import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Nome do bucket para armazenar os recibos
const RECEIPTS_BUCKET = 'receipts';

/**
 * Inicializa o bucket de recibos no Supabase Storage
 */
export const initReceiptStorage = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase is not configured');
    return false;
  }
  
  try {
    // Verificar se o bucket já existe
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      console.error('Error listing buckets:', getBucketsError.message);
      return false;
    }
    
    // Se o bucket já existe, retornar sucesso
    if (buckets?.some(bucket => bucket.name === RECEIPTS_BUCKET)) {
      console.log('Receipts bucket already exists');
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
      console.error('Error creating receipts bucket:', createBucketError.message);
      return false;
    }
    
    console.log('Receipts bucket created successfully');
    return true;
  } catch (error) {
    console.error('Error initializing receipt storage:', error);
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
      console.log('File is not an image, returning original');
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        try {
          // Criar canvas para redimensionar
          const canvas = document.createElement('canvas');
          
          // Definir tamanho máximo (800x800 é melhor para dispositivos móveis com restrições)
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;

          console.log(`Original image size: ${width}x${height}`);

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

          console.log(`New image size: ${width}x${height}`);

          canvas.width = width;
          canvas.height = height;

          // Desenhar imagem redimensionada no canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Could not get 2D context from canvas');
            return resolve(file);
          }
          
          ctx.drawImage(img, 0, 0, width, height);

          // Converter para blob com qualidade reduzida
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                console.error('Failed to convert canvas to blob');
                return resolve(file);
              }

              // Criar novo arquivo a partir do blob
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              console.log(`Resized image: ${width}x${height}, size: ${(newFile.size / 1024).toFixed(1)}KB`);
              resolve(newFile);
            },
            'image/jpeg',
            0.6 // Qualidade 60% para melhor compressão
          );
        } catch (error) {
          console.error('Error processing image:', error);
          resolve(file); // Em caso de erro, usar arquivo original
        }
      };

      img.onerror = (e) => {
        console.error('Error loading image for resizing:', e);
        resolve(file);
      };
    };

    reader.onerror = (e) => {
      console.error('Error reading file for resizing:', e);
      resolve(file);
    };
  });
};

/**
 * Verifica se o bucket existe e cria se necessário
 */
const checkAndCreateBucket = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase is not configured');
    return false;
  }
  
  try {
    // Verificar se o bucket existe
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      console.error('Error listing buckets:', getBucketsError.message);
      // Em caso de erro, assumimos que o armazenamento não está disponível
      // mas continuamos a execução sem bloquear funcionalidades críticas
      console.log('Storage may not be available, continuing without receipts storage');
      return true;
    }
    
    // Se o bucket já existe, retornar sucesso
    if (buckets?.some(bucket => bucket.name === RECEIPTS_BUCKET)) {
      console.log('Receipts bucket exists');
      return true;
    }
    
    console.log('Bucket not found, creating...');
    
    // Criar o bucket
    const { error: createBucketError } = await supabase.storage.createBucket(
      RECEIPTS_BUCKET,
      {
        public: true, 
        fileSizeLimit: 10485760, // 10MB
      }
    );
    
    if (createBucketError) {
      console.error('Error creating bucket:', createBucketError.message);
      // Em caso de erro na criação, continuamos sem o armazenamento de recibos
      // mas permitimos o uso de outras funcionalidades
      console.log('Unable to create storage bucket, continuing without receipts storage');
      return true;
    }
    
    console.log('Bucket created successfully');
    return true;
  } catch (error) {
    console.error('Error checking/creating bucket:', error);
    // Em caso de exceção, continuamos sem o armazenamento
    console.log('Exception in storage setup, continuing without receipts storage');
    return true;
  }
};

/**
 * Faz upload de uma imagem para o Supabase Storage
 */
export const uploadReceipt = async (file: File): Promise<string | null> => {
  if (!supabase) {
    console.error('Supabase is not configured');
    return null;
  }
  
  try {
    console.log(`Starting receipt processing. Original size: ${(file.size / 1024).toFixed(1)}KB`);
    
    // Verificar bucket antes do upload
    const bucketReady = await checkAndCreateBucket();
    if (!bucketReady) {
      console.error('Failed to prepare storage bucket');
      throw new Error('Storage preparation failed');
    }
    
    // Reduzir o tamanho da imagem
    const optimizedFile = await reduceImageSize(file);
    console.log(`Image processed. Final size: ${(optimizedFile.size / 1024).toFixed(1)}KB`);
    
    // Gerar um nome único para o arquivo
    const fileExt = optimizedFile.type.startsWith('image/') ? 'jpg' : (file.name.split('.').pop() || 'jpg');
    const fileName = `${uuidv4()}.${fileExt}`;
    
    console.log(`Uploading file to Supabase: ${fileName}`);
    
    // Fazer upload do arquivo
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(fileName, optimizedFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading receipt:', error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    if (!data || !data.path) {
      console.error('Upload succeeded but no data returned');
      throw new Error('No file data returned from upload');
    }
    
    console.log('Upload completed successfully. Getting public URL...');
    
    // Obter a URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from(RECEIPTS_BUCKET)
      .getPublicUrl(fileName);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('Failed to get public URL');
      throw new Error('Could not generate public URL');
    }
    
    console.log('Public URL obtained:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error during upload process:', error);
    throw error; // Re-throw to let calling code handle it
  }
};

/**
 * Remove uma imagem do Supabase Storage
 */
export const deleteReceipt = async (url: string): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase is not configured');
    return false;
  }
  
  try {
    // Extrair o nome do arquivo da URL
    const fileName = url.split('/').pop();
    
    if (!fileName) {
      console.error('Invalid file name:', url);
      return false;
    }
    
    console.log('Removing receipt:', fileName);
    
    // Remover o arquivo
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .remove([fileName]);
    
    if (error) {
      console.error('Error removing receipt:', error.message);
      return false;
    }
    
    console.log('Receipt removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing receipt:', error);
    return false;
  }
}; 