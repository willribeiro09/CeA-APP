import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Nome do bucket para armazenar os recibos
const RECEIPTS_BUCKET = 'receipts';

/**
 * Inicializa o bucket de recibos no Supabase Storage
 */
export const initReceiptStorage = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    // Verificar se o bucket já existe
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      console.error('Erro ao listar buckets:', getBucketsError);
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
        public: false,
        fileSizeLimit: 5242880, // 5MB
      }
    );
    
    if (createBucketError) {
      console.error('Erro ao criar bucket de recibos:', createBucketError);
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
 * Faz upload de uma imagem para o Supabase Storage
 */
export const uploadReceipt = async (file: File): Promise<string | null> => {
  if (!supabase) return null;
  
  try {
    // Gerar um nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Fazer upload do arquivo
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(filePath, file);
    
    if (error) {
      console.error('Erro ao fazer upload do recibo:', error);
      return null;
    }
    
    // Obter a URL pública do arquivo
    const { data } = supabase.storage
      .from(RECEIPTS_BUCKET)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload do recibo:', error);
    return null;
  }
};

/**
 * Remove uma imagem do Supabase Storage
 */
export const deleteReceipt = async (url: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    // Extrair o nome do arquivo da URL
    const fileName = url.split('/').pop();
    
    if (!fileName) {
      console.error('Nome de arquivo inválido:', url);
      return false;
    }
    
    // Remover o arquivo
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .remove([fileName]);
    
    if (error) {
      console.error('Erro ao remover recibo:', error);
      return false;
    }
    
    console.log('Recibo removido com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao remover recibo:', error);
    return false;
  }
}; 