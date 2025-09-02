import { supabase } from './supabase';
import { ProjectPhoto } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PhotoService {
  private static bucketName = 'project-photos';

  static async uploadPhoto(file: File, projectId: string, deviceId?: string): Promise<ProjectPhoto | null> {
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${projectId}/${uuidv4()}.${fileExtension}`;
      
      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      // Criar registro na tabela
      const photoData = {
        id: uuidv4(),
        project_id: projectId,
        filename: file.name,
        url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        device_id: deviceId,
        is_edited: false,
        metadata: {
          originalName: file.name,
          uploadedFrom: deviceId
        }
      };

      const { data: dbData, error: dbError } = await supabase
        .from('project_photos')
        .insert([photoData])
        .select()
        .single();

      if (dbError) {
        console.error('Erro ao salvar no banco:', dbError);
        // Limpar arquivo do storage se falhou ao salvar no banco
        await supabase.storage.from(this.bucketName).remove([fileName]);
        return null;
      }

      return {
        id: dbData.id,
        projectId: dbData.project_id,
        filename: dbData.filename,
        path: fileName,
        url: dbData.url,
        fileSize: dbData.file_size,
        mimeType: dbData.mime_type,
        uploadedAt: dbData.uploaded_at,
        deviceId: dbData.device_id,
        isEdited: dbData.is_edited,
        metadata: dbData.metadata
      };
    } catch (error) {
      console.error('Erro no upload da foto:', error);
      return null;
    }
  }

  static async saveEditedPhoto(originalPhoto: ProjectPhoto, editedDataUrl: string, deviceId?: string): Promise<ProjectPhoto | null> {
    try {
      // Converter data URL para blob
      const response = await fetch(editedDataUrl);
      const blob = await response.blob();
      
      const fileExtension = 'png'; // Data URL sempre vem como PNG
      const fileName = `${originalPhoto.projectId}/edited_${uuidv4()}.${fileExtension}`;
      
      // Upload da imagem editada
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/png'
        });

      if (uploadError) {
        console.error('Erro no upload da imagem editada:', uploadError);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      // Criar registro na tabela
      const photoData = {
        id: uuidv4(),
        project_id: originalPhoto.projectId,
        filename: `edited_${originalPhoto.filename || 'image.png'}`,
        url: urlData.publicUrl,
        file_size: blob.size,
        mime_type: 'image/png',
        device_id: deviceId,
        is_edited: true,
        original_photo_id: originalPhoto.id,
        metadata: {
          originalPhotoId: originalPhoto.id,
          editedFrom: deviceId,
          editedAt: new Date().toISOString()
        }
      };

      const { data: dbData, error: dbError } = await supabase
        .from('project_photos')
        .insert([photoData])
        .select()
        .single();

      if (dbError) {
        console.error('Erro ao salvar foto editada no banco:', dbError);
        // Limpar arquivo do storage se falhou ao salvar no banco
        await supabase.storage.from(this.bucketName).remove([fileName]);
        return null;
      }

      return {
        id: dbData.id,
        projectId: dbData.project_id,
        filename: dbData.filename,
        path: fileName,
        url: dbData.url,
        fileSize: dbData.file_size,
        mimeType: dbData.mime_type,
        uploadedAt: dbData.uploaded_at,
        editedAt: dbData.created_at,
        deviceId: dbData.device_id,
        isEdited: dbData.is_edited,
        originalPhotoId: dbData.original_photo_id,
        metadata: dbData.metadata
      };
    } catch (error) {
      console.error('Erro ao salvar foto editada:', error);
      return null;
    }
  }

  static async getProjectPhotos(projectId: string): Promise<ProjectPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('project_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar fotos do projeto:', error);
        return [];
      }

      return data.map(photo => ({
        id: photo.id,
        projectId: photo.project_id,
        filename: photo.filename,
        path: photo.filename, // Usar filename como path
        url: photo.url,
        fileSize: photo.file_size,
        mimeType: photo.mime_type,
        uploadedAt: photo.uploaded_at,
        editedAt: photo.updated_at !== photo.created_at ? photo.updated_at : undefined,
        deviceId: photo.device_id,
        isEdited: photo.is_edited,
        originalPhotoId: photo.original_photo_id,
        metadata: photo.metadata
      }));
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      return [];
    }
  }

  static async deletePhoto(photoId: string): Promise<boolean> {
    try {
      // Primeiro, buscar informações da foto para deletar do storage
      const { data: photoData, error: fetchError } = await supabase
        .from('project_photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (fetchError || !photoData) {
        console.error('Erro ao buscar dados da foto:', fetchError);
        return false;
      }

      // Deletar do storage
      const fileName = photoData.filename || photoData.url.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from(this.bucketName)
          .remove([`${photoData.project_id}/${fileName}`]);
        
        if (storageError) {
          console.warn('Erro ao deletar do storage (continuando):', storageError);
        }
      }

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        console.error('Erro ao deletar foto do banco:', dbError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      return false;
    }
  }

  // Função para sincronizar fotos locais com o servidor
  static async syncProjectPhotos(projectId: string): Promise<ProjectPhoto[]> {
    try {
      return await this.getProjectPhotos(projectId);
    } catch (error) {
      console.error('Erro na sincronização de fotos:', error);
      return [];
    }
  }
}
