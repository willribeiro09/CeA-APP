import { supabase } from './supabase';
import { ExpenseReceipt } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ReceiptService {
  private static bucketName = 'receipts';

  static async uploadReceipt(file: File, expenseId: string, deviceId?: string): Promise<ExpenseReceipt | null> {
    try {
      const fileExtension = file.name.split('.').pop();
      const uniqueName = `${uuidv4()}.${fileExtension}`;
      const storagePath = `${expenseId}/${uniqueName}`;
      
      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload do recibo:', uploadError);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      // Criar objeto de recibo
      const receipt: ExpenseReceipt = {
        id: uuidv4(),
        filename: file.name,
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        mimeType: file.type
      };

      return receipt;
    } catch (error) {
      console.error('Erro no upload do recibo:', error);
      return null;
    }
  }

  static async deleteReceipt(receipt: ExpenseReceipt): Promise<boolean> {
    try {
      // Extrair o caminho do storage da URL
      const url = new URL(receipt.url);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(-2).join('/'); // expenseId/filename
      
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([storagePath]);

      if (error) {
        console.error('Erro ao deletar recibo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar recibo:', error);
      return false;
    }
  }
}
