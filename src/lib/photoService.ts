import { supabase } from './supabase';
import { ProjectPhoto } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PhotoService {
  private static bucketName = 'project-photos';

  static async uploadPhoto(file: File, projectId: string, deviceId?: string): Promise<ProjectPhoto | null> {
    try {
      const fileExtension = file.name.split('.').pop();
      const uniqueName = `${uuidv4()}.${fileExtension}`;
      const storagePath = `${projectId}/${uniqueName}`;
      
      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(storagePath, file, {
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
        .getPublicUrl(storagePath);

      // Criar registro na tabela
      const photoData = {
        id: uuidv4(),
        project_id: projectId,
        // Guardar apenas o nome único; o caminho completo é project_id/filename
        filename: uniqueName,
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
        await supabase.storage.from(this.bucketName).remove([storagePath]);
        return null;
      }

      return {
        id: dbData.id,
        projectId: dbData.project_id,
        filename: dbData.filename,
        path: storagePath,
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
      console.log('🔄 PHOTO_SERVICE - Iniciando edição:', {
        originalId: originalPhoto.id,
        originalFilename: originalPhoto.filename,
        originalPath: originalPhoto.path,
        originalUrl: originalPhoto.url?.substring(0, 50) + '...'
      });

      // Converter data URL para blob
      const response = await fetch(editedDataUrl);
      const blob = await response.blob();
      
      const fileExtension = 'png'; // Data URL sempre vem como PNG
      const uniqueName = `edited_${uuidv4()}.${fileExtension}`;
      const storagePath = `${originalPhoto.projectId}/${uniqueName}`;
      
      console.log('📁 PHOTO_SERVICE - Upload para storage:', {
        newFilename: uniqueName,
        storagePath: storagePath,
        blobSize: blob.size
      });

      // Upload da imagem editada
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/png'
        });

      if (uploadError) {
        console.error('❌ PHOTO_SERVICE - Erro no upload:', uploadError);
        return null;
      }

      console.log('✅ PHOTO_SERVICE - Upload concluído');

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      console.log('🔗 PHOTO_SERVICE - URL pública gerada:', urlData.publicUrl.substring(0, 50) + '...');

      // ATUALIZAR a foto original em vez de criar uma nova
      console.log('💾 PHOTO_SERVICE - Atualizando registro no banco...');
      const { data: dbData, error: dbError } = await supabase
        .from('project_photos')
        .update({
          filename: uniqueName,
          url: urlData.publicUrl,
          file_size: blob.size,
          mime_type: 'image/png',
          is_edited: true,
          updated_at: new Date().toISOString(),
          metadata: {
            ...originalPhoto.metadata,
            editedFrom: deviceId,
            editedAt: new Date().toISOString(),
            lastEdit: new Date().toISOString()
          }
        })
        .eq('id', originalPhoto.id)
        .select()
        .single();

      if (dbError) {
        console.error('❌ PHOTO_SERVICE - Erro ao atualizar banco:', dbError);
        // Limpar arquivo do storage se falhou ao salvar no banco
        await supabase.storage.from(this.bucketName).remove([storagePath]);
        return null;
      }

      console.log('✅ PHOTO_SERVICE - Banco atualizado com sucesso');

      // Deletar arquivo original do storage se existir
      if (originalPhoto.path && originalPhoto.path !== storagePath) {
        console.log('🗑️ PHOTO_SERVICE - Deletando arquivo original:', originalPhoto.path);
        try {
          await supabase.storage
            .from(this.bucketName)
            .remove([originalPhoto.path]);
          console.log('✅ PHOTO_SERVICE - Arquivo original deletado');
        } catch (error) {
          console.warn('⚠️ PHOTO_SERVICE - Erro ao deletar arquivo original:', error);
        }
      }

      const result = {
        id: dbData.id,
        projectId: dbData.project_id,
        filename: dbData.filename,
        path: storagePath,
        url: dbData.url,
        fileSize: dbData.file_size,
        mimeType: dbData.mime_type,
        uploadedAt: dbData.uploaded_at,
        editedAt: dbData.updated_at,
        deviceId: dbData.device_id,
        isEdited: dbData.is_edited,
        originalPhotoId: dbData.original_photo_id,
        metadata: dbData.metadata
      };

      console.log('🎉 PHOTO_SERVICE - Edição concluída:', {
        finalId: result.id,
        finalFilename: result.filename,
        finalUrl: result.url?.substring(0, 50) + '...',
        isEdited: result.isEdited
      });

      return result;
    } catch (error) {
      console.error('❌ PHOTO_SERVICE - Erro geral:', error);
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
        path: `${photo.project_id}/${photo.filename}`,
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
      console.log('🗑️ DEBUG - PhotoService.deletePhoto iniciado:', { photoId });
      
      // Primeiro, buscar informações da foto para deletar do storage
      const { data: photoData, error: fetchError } = await supabase
        .from('project_photos')
        .select('id, project_id, filename, url')
        .eq('id', photoId)
        .maybeSingle();

      console.log('🔍 DEBUG - Dados da foto encontrados:', {
        photoData,
        fetchError,
        found: !!photoData
      });

      let projectIdFromDb: string | undefined = photoData?.project_id;
      let filenameFromDb: string | undefined = photoData?.filename;
      const urlFromDb: string | undefined = photoData?.url;

      // Extrair caminho do storage via URL pública, se necessário
      const derivePathFromUrl = (publicUrl?: string): { projectId?: string, filename?: string } => {
        if (!publicUrl) return {};
        try {
          const url = new URL(publicUrl);
          const parts = url.pathname.split('/');
          // .../object/public/<bucket>/<project_id>/<filename>
          const publicIndex = parts.findIndex(p => p === 'public');
          if (publicIndex >= 0 && parts.length >= publicIndex + 3) {
            const projectId = parts[publicIndex + 2];
            const filename = parts[publicIndex + 3];
            return { projectId, filename };
          }
        } catch {}
        return {};
      };

      if (!projectIdFromDb || !filenameFromDb) {
        const derived = derivePathFromUrl(urlFromDb);
        projectIdFromDb = projectIdFromDb || derived.projectId;
        filenameFromDb = filenameFromDb || derived.filename;
      }

      // PRIMEIRO: Deletar todas as fotos editadas que referenciam esta foto original
      console.log('🔍 DEBUG - Buscando fotos editadas que referenciam:', photoId);
      const { data: editedPhotos, error: editedError } = await supabase
        .from('project_photos')
        .select('id, project_id, filename, url')
        .eq('original_photo_id', photoId);

      console.log('📝 DEBUG - Fotos editadas encontradas:', {
        editedPhotos,
        editedError,
        count: editedPhotos?.length || 0
      });

      if (!editedError && editedPhotos) {
        for (const editedPhoto of editedPhotos) {
          console.log('🗑️ DEBUG - Deletando foto editada:', editedPhoto.id);
          // Deletar do storage
          if (editedPhoto.project_id && editedPhoto.filename) {
            const storagePath = `${editedPhoto.project_id}/${editedPhoto.filename}`;
            console.log('📁 DEBUG - Deletando do storage:', storagePath);
            await supabase.storage
              .from(this.bucketName)
              .remove([storagePath]);
          }
          
          // Deletar do banco
          console.log('🗄️ DEBUG - Deletando do banco:', editedPhoto.id);
          await supabase
            .from('project_photos')
            .delete()
            .eq('id', editedPhoto.id);
        }
      }

      // SEGUNDO: Deletar a foto original do storage
      if (projectIdFromDb && filenameFromDb) {
        const storagePath = `${projectIdFromDb}/${filenameFromDb}`;
        console.log('📁 DEBUG - Deletando foto original do storage:', storagePath);
        const { error: storageError } = await supabase.storage
          .from(this.bucketName)
          .remove([storagePath]);
        if (storageError) {
          console.warn('⚠️ DEBUG - Erro ao deletar do storage (continuando):', storageError);
        } else {
          console.log('✅ DEBUG - Foto original deletada do storage com sucesso');
        }
      } else {
        console.log('⚠️ DEBUG - Não foi possível determinar caminho do storage para foto original');
      }

      // TERCEIRO: Deletar a foto original do banco
      console.log('🗄️ DEBUG - Deletando foto original do banco:', photoId);
      const { error: dbError } = await supabase
        .from('project_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        console.error('❌ DEBUG - Erro ao deletar foto do banco:', dbError);
        return false;
      }

      console.log('✅ DEBUG - Foto original deletada do banco com sucesso');
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
