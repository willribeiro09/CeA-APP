import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { Project, ProjectPhoto } from '../types';
import { Button } from './ui/button';
import { PhotoService } from '../lib/photoService';
import { getEnvironmentInfo } from '../lib/deviceUtils';
import PhotoViewer from './PhotoViewer';

type Props = {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotosChange: (projectId: string, photos: ProjectPhoto[]) => void;
  onOpenEditor: (photo: ProjectPhoto) => void;
};

export default function ProjectSummaryDialog({ project, open, onOpenChange, onPhotosChange, onOpenEditor }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // ID da foto sendo deletada
  const [isEditing, setIsEditing] = useState<string | null>(null); // ID da foto sendo editada
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<ProjectPhoto | null>(null);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Carregar fotos do projeto quando o pop-up abrir
  useEffect(() => {
    if (project && open) {
      loadProjectPhotos();
    } else if (!open) {
      // Limpar estados quando o dialog fechar
      setIsEditing(null);
      setIsDeleting(null);
    }
  }, [project, open]);

  const loadProjectPhotos = async () => {
    if (!project) return;
    
    try {
      const serverPhotos = await PhotoService.getProjectPhotos(project.id);
      const localPhotos = project.photos || [];
      
      // Combinar fotos locais e do servidor, removendo duplicatas
      const allPhotos = [...localPhotos];
      serverPhotos.forEach(serverPhoto => {
        if (!allPhotos.find(p => p.id === serverPhoto.id)) {
          allPhotos.push(serverPhoto);
        }
      });
      
      setPhotos(allPhotos);
      onPhotosChange(project.id, allPhotos);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
      setPhotos(project.photos || []);
    }
  };

  const handleSelectFiles = () => {
    inputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!project || !files || files.length === 0) return;
    
    setIsUploading(true);
    const deviceInfo = getEnvironmentInfo();
    const newPhotos: ProjectPhoto[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;
      
      try {
        // Tentar fazer upload para o Supabase
        const uploadedPhoto = await PhotoService.uploadPhoto(file, project.id, deviceInfo.deviceId);
        
        if (uploadedPhoto) {
          newPhotos.push(uploadedPhoto);
        } else {
          // Fallback para armazenamento local
          const objectUrl = URL.createObjectURL(file);
          const localPhoto: ProjectPhoto = {
            id: `local-${project.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            projectId: project.id,
            filename: file.name,
            path: `local-${file.name}`,
            url: objectUrl,
            fileSize: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            deviceId: deviceInfo.deviceId,
            metadata: { isLocal: true }
          };
          newPhotos.push(localPhoto);
        }
      } catch (error) {
        console.error('Erro no upload:', error);
        // Fallback para armazenamento local
        const objectUrl = URL.createObjectURL(file);
        const localPhoto: ProjectPhoto = {
          id: `local-${project.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          projectId: project.id,
          filename: file.name,
          path: `local-${file.name}`,
          url: objectUrl,
          fileSize: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          deviceId: deviceInfo.deviceId,
          metadata: { isLocal: true }
        };
        newPhotos.push(localPhoto);
      }
    }
    
    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    onPhotosChange(project.id, updatedPhotos);
    setIsUploading(false);
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photo: ProjectPhoto) => {
    if (!project || isDeleting) return;
    
    setIsDeleting(photo.id);
    
    try {
      // Verificar se é uma foto do servidor (não local e não editada localmente)
      const isServerPhoto = !photo.metadata?.isLocal && 
                           !photo.id.startsWith('local-') && 
                           !photo.metadata?.editedLocally;
      
      if (isServerPhoto) {
        const success = await PhotoService.deletePhoto(photo.id);
        if (!success) {
          console.warn('Não foi possível deletar a foto do servidor');
        }
      }
      
      // Remover da lista local (sempre fazer isso)
      const updatedPhotos = photos.filter(p => p.id !== photo.id);
      
      setPhotos(updatedPhotos);
      onPhotosChange(project.id, updatedPhotos);
      
      // Limpar URL de objeto se for local
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePhotoClick = (photo: ProjectPhoto) => {
    setSelectedPhotoForView(photo);
    setIsPhotoViewerOpen(true);
  };

  const handlePhotoViewerEdit = (photo: ProjectPhoto) => {
    setIsPhotoViewerOpen(false);
    setIsEditing(photo.id);
    onOpenEditor(photo);
  };

  const handlePhotoViewerDelete = (photo: ProjectPhoto) => {
    setIsPhotoViewerOpen(false);
    handleDeletePhoto(photo);
  };

  return (
    <Dialog.Root open={open ? true : false} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-4 shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto z-[100]"
          onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
        >
          <div className="flex justify-between items-center mb-2 sticky top-0 bg-white z-10 pb-2 border-b">
            <Dialog.Title className="text-lg font-semibold">
              {project?.name || 'Project'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {project ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Client</div>
                  <div className="font-medium text-gray-900">{project.client}</div>
                </div>
                {project.projectNumber ? (
                  <div>
                    <div className="text-gray-500">Number</div>
                    <div className="font-medium text-gray-900">{project.projectNumber}</div>
                  </div>
                ) : null}
                <div>
                  <div className="text-gray-500">Start Date</div>
                  <div className="font-medium text-gray-900">{new Date(project.startDate).toLocaleDateString('en-US')}</div>
                </div>
                {project.location ? (
                  <div>
                    <div className="text-gray-500">Location</div>
                    <div className="font-medium text-gray-900">{project.location}</div>
                  </div>
                ) : null}
                <div>
                  <div className="text-gray-500">Status</div>
                  <div className="font-medium text-gray-900">{project.status === 'completed' ? 'Completed' : 'In Progress'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Value</div>
                  <div className="font-medium text-[#5ABB37]">$ {(project.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              {project.description ? (
                <div>
                  <div className="text-gray-500 text-sm mb-1">Description</div>
                  <div className="text-gray-800 whitespace-pre-wrap">{project.description}</div>
                </div>
              ) : null}

              {project.notes ? (
                <div>
                  <div className="text-gray-500 text-sm mb-1">Notes</div>
                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border">{project.notes}</div>
                </div>
              ) : null}

              <div className="flex items-center justify-between mt-4">
                <div className="text-gray-900 font-medium">Photos</div>
                <div className="flex gap-2">
                  <Button onClick={handleSelectFiles} disabled={isUploading} className="h-9 px-3">
                    <Upload className="w-4 h-4 mr-2" /> {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.currentTarget.files)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-2">
                {photos.length === 0 ? (
                  <div className="col-span-3 text-sm text-gray-500 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> No photos uploaded.
                  </div>
                ) : null}
                {photos.map((p) => (
                  <div key={p.id} className="relative group">
                    <img 
                      src={p.url} 
                      alt="project" 
                      className="w-full h-28 object-cover rounded transition-transform group-hover:scale-105" 
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded" />
                    
                    {/* Botões de ação */}
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditor(p);
                        }}
                        disabled={isEditing === p.id}
                        className={`flex-1 rounded px-2 py-1 text-xs flex items-center justify-center gap-1 ${
                          isEditing === p.id 
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                            : 'bg-blue-600/90 text-white hover:bg-blue-700/90'
                        }`}
                      >
                        {isEditing === p.id ? (
                          <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            Editing...
                          </>
                        ) : (
                          <>
                            <Pencil className="w-3 h-3" /> Edit
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this photo?')) {
                            handleDeletePhoto(p);
                          }
                        }}
                        disabled={isDeleting === p.id}
                        className={`rounded px-2 py-1 text-xs ${
                          isDeleting === p.id 
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                            : 'bg-red-600/90 text-white hover:bg-red-700/90'
                        }`}
                      >
                        {isDeleting === p.id ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    
                    {/* Indicadores de status */}
                    {p.isEdited && (
                      <div className="absolute top-2 left-2 bg-green-600/90 text-white rounded px-1 py-0.5 text-xs">
                        Edited
                      </div>
                    )}
                    {p.metadata?.isLocal && (
                      <div className="absolute top-2 right-2 bg-orange-600/90 text-white rounded px-1 py-0.5 text-xs">
                        Local
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>

      {/* Photo Viewer */}
      <PhotoViewer
        photo={selectedPhotoForView}
        open={isPhotoViewerOpen}
        onOpenChange={setIsPhotoViewerOpen}
        onEdit={handlePhotoViewerEdit}
        onDelete={handlePhotoViewerDelete}
      />
    </Dialog.Root>
  );
}


