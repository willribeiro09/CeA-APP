import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Pencil, Minus, Square, Circle, Type, Undo2, RotateCcw, Save, Trash2, ZoomIn, ZoomOut, Sliders } from 'lucide-react';
import { ProjectPhoto } from '../types';
import { PhotoService } from '../lib/photoService';
import { getEnvironmentInfo } from '../lib/deviceUtils';

type Tool = 'freehand' | 'line' | 'rectangle' | 'circle' | 'text';

type Props = {
  photo: ProjectPhoto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: ProjectPhoto) => void;
};


// Paleta de cores simplificada (máximo 5 cores)
const COLOR_PALETTE = [
  '#FF0000', // Vermelho
  '#0066FF', // Azul
  '#00CC00', // Verde
  '#FF8800', // Laranja
  '#000000', // Preto
];

interface DrawAction {
  type: 'stroke' | 'shape' | 'text';
  data: ImageData;
}

export default function ImageEditor({ photo, open, onOpenChange, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>('freehand');
  const [color, setColor] = useState('#FF0000');
  const [size, setSize] = useState(6);
  const [text, setText] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<DrawAction[]>([]);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!photo) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photo.url;
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Calcular dimensões para preencher a tela (mais agressivo)
      const container = canvas.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width - 16; // padding reduzido
      const containerHeight = containerRect.height - 16; // padding reduzido
      
      const imgAspectRatio = img.width / img.height;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let canvasWidth, canvasHeight;
      
      if (imgAspectRatio > containerAspectRatio) {
        // Imagem é mais larga - preencher pela largura
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / imgAspectRatio;
      } else {
        // Imagem é mais alta - preencher pela altura
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * imgAspectRatio;
      }
      
      // Garantir que a imagem seja grande o suficiente para boa qualidade
      const minSize = 800; // Tamanho mínimo para manter qualidade
      if (canvasWidth < minSize || canvasHeight < minSize) {
        const scale = Math.max(minSize / canvasWidth, minSize / canvasHeight);
        canvasWidth *= scale;
        canvasHeight *= scale;
      }
      
      // Definir dimensões do canvas
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Desenhar imagem ajustada
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      
      // Salvar estado original para reset
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setOriginalImageData(imageData);
      setHistory([]);
      
      // Resetar zoom e posição para ajustar à tela
      setCanvasScale(1);
      setCanvasPosition({ x: 0, y: 0 });
    };
  }, [photo]);

  // Fechar dropdown de cor quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isColorPickerOpen) {
        const target = event.target as Element;
        if (!target.closest('.color-picker-container')) {
          setIsColorPickerOpen(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isColorPickerOpen]);

  // Salvar estado atual no histórico
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, { type: 'stroke', data: imageData }]);
  };

  // Desfazer última ação
  const undo = () => {
    if (history.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const newHistory = [...history];
    newHistory.pop(); // Remove apenas a última ação
    
    if (newHistory.length > 0) {
      const lastState = newHistory[newHistory.length - 1];
      ctx.putImageData(lastState.data, 0, 0);
    } else if (originalImageData) {
      // Se não há histórico, volta para o original
      ctx.putImageData(originalImageData, 0, 0);
    }
    
    setHistory(newHistory);
  };

  // Resetar para imagem original
  const reset = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !originalImageData) return;
    
    ctx.putImageData(originalImageData, 0, 0);
    setHistory([]);
  };

  // Funções de zoom do canvas
  const zoomIn = () => {
    setCanvasScale(prev => Math.min(prev * 1.2, 3)); // Máximo 3x zoom
  };

  const zoomOut = () => {
    setCanvasScale(prev => Math.max(prev / 1.2, 0.5)); // Mínimo 0.5x zoom
  };

  const resetZoom = () => {
    setCanvasScale(1);
    setCanvasPosition({ x: 0, y: 0 });
    
    // Redesenhar a imagem ajustada à tela
    if (imgRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imgRef.current;
      
      if (!ctx) return;
      
      // Calcular dimensões para preencher a tela (mais agressivo)
      const container = canvas.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width - 16; // padding reduzido
      const containerHeight = containerRect.height - 16; // padding reduzido
      
      const imgAspectRatio = img.width / img.height;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let canvasWidth, canvasHeight;
      
      if (imgAspectRatio > containerAspectRatio) {
        // Imagem é mais larga - preencher pela largura
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / imgAspectRatio;
      } else {
        // Imagem é mais alta - preencher pela altura
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * imgAspectRatio;
      }
      
      // Garantir que a imagem seja grande o suficiente para boa qualidade
      const minSize = 800; // Tamanho mínimo para manter qualidade
      if (canvasWidth < minSize || canvasHeight < minSize) {
        const scale = Math.max(minSize / canvasWidth, minSize / canvasHeight);
        canvasWidth *= scale;
        canvasHeight *= scale;
      }
      
      // Definir dimensões do canvas
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      // Desenhar imagem ajustada
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      
      // Salvar estado original para reset
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setOriginalImageData(imageData);
    }
  };

  // Função para detectar se é um gesto de dois dedos
  const isTwoFingerGesture = (e: React.TouchEvent) => {
    return e.touches.length === 2;
  };

  // Handlers para zoom e arrastar (similar ao PhotoViewer)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setLastTouch({ x: touch.clientX, y: touch.clientY });
      // Só permite arrastar se estiver com zoom E não estiver sobre o canvas
      const target = e.target as HTMLElement;
      setIsDragging(canvasScale > 1 && !target.tagName.includes('CANVAS'));
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      setLastTouch(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Zoom com pinça
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const newScale = Math.min(Math.max(distance / 200, 0.5), 3);
      setCanvasScale(newScale);
      setIsDragging(newScale > 1);
    } else if (e.touches.length === 1 && isDragging && lastTouch) {
      // Pan/arrastar quando com zoom
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouch.x;
      const deltaY = touch.clientY - lastTouch.y;
      
      setCanvasPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastTouch({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouch(null);
  };

  // Handlers para mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (canvasScale > 1) {
      setIsMouseDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDragging && lastMouse && canvasScale > 1) {
      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;
      
      setCanvasPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsMouseDragging(false);
    setLastMouse(null);
  };

  // Função para calcular a distância entre dois pontos
  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Função para calcular o ponto médio entre dois toques
  const getMidpoint = (touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Obter posição tanto para mouse quanto touch
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return { 
      x: (clientX - rect.left) * scaleX, 
      y: (clientY - rect.top) * scaleY 
    };
  };

  const begin = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    e.preventDefault();
    
    // Se for um gesto de dois dedos, iniciar pan
    if ('touches' in e && isTwoFingerGesture(e)) {
      setIsPanning(true);
      const midpoint = getMidpoint(e.touches[0], e.touches[1]);
      setLastPanPoint(midpoint);
      return;
    }
    
    // Para toque único no canvas, sempre editar (não mover)
    const pos = getPos(e);
    setDrawing(true);
    setStart(pos);
    
    // Salvar estado antes de começar a desenhar
    saveToHistory();
    
      const ctx = canvasRef.current!.getContext('2d');
      if (!ctx) return;
    
    // Configurar estilo para todas as ferramentas
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (tool === 'freehand') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'text') {
      // Para texto, não fazer nada aqui, será feito no end
    } else {
      // Para formas (line, rectangle, circle), começar o desenho
      ctx.beginPath();
      if (tool === 'line') {
        ctx.moveTo(pos.x, pos.y);
      } else if (tool === 'rectangle') {
        ctx.moveTo(pos.x, pos.y);
      } else if (tool === 'circle') {
        ctx.moveTo(pos.x, pos.y);
      }
    }
  };

  const move = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Se estiver fazendo pan com dois dedos
    if (isPanning && 'touches' in e && e.touches.length === 2) {
      const midpoint = getMidpoint(e.touches[0], e.touches[1]);
      const deltaX = midpoint.x - lastPanPoint.x;
      const deltaY = midpoint.y - lastPanPoint.y;
      
      setCanvasPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint(midpoint);
      return;
    }
    
    if (!drawing) return;
    
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext('2d');
    if (!ctx || !imgRef.current) return;
    
    if (tool === 'freehand') {
      // Para desenho livre, continuar a linha
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'line' && start) {
      // Para linha, redesenhar do início ao ponto atual
      if (history.length > 0) {
        const lastState = history[history.length - 1];
        ctx.putImageData(lastState.data, 0, 0);
      } else if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    } else if (tool === 'rectangle' && start) {
      // Para retângulo, redesenhar do início ao ponto atual
      if (history.length > 0) {
        const lastState = history[history.length - 1];
        ctx.putImageData(lastState.data, 0, 0);
      } else if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const width = pos.x - start.x;
      const height = pos.y - start.y;
      ctx.rect(start.x, start.y, width, height);
      ctx.stroke();
    } else if (tool === 'circle' && start) {
      // Para círculo, redesenhar do início ao ponto atual
      if (history.length > 0) {
        const lastState = history[history.length - 1];
        ctx.putImageData(lastState.data, 0, 0);
      } else if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const r = Math.sqrt(dx*dx + dy*dy);
        ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
  };

  const end = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Finalizar pan se estiver ativo
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    if (!drawing) return;
    
    setDrawing(false);
    
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext('2d');
    if (!ctx) return;
    
    if (tool === 'text' && text && start) {
      ctx.fillStyle = color;
      ctx.font = `${Math.max(16, size * 4)}px Arial, sans-serif`;
      ctx.fillText(text, start.x, start.y);
      setText(''); // Limpar texto após usar
    } else if (tool === 'line' && start) {
      // Finalizar linha do ponto inicial ao ponto final
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'rectangle' && start) {
      // Finalizar retângulo do ponto inicial ao ponto final
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const width = pos.x - start.x;
      const height = pos.y - start.y;
      ctx.rect(start.x, start.y, width, height);
      ctx.stroke();
    } else if (tool === 'circle' && start) {
      // Finalizar círculo do ponto inicial ao ponto final
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;
      const r = Math.sqrt(dx*dx + dy*dy);
      ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Limpar estado de início
    setStart(null);
  };

  const handleSave = async () => {
    if (!photo || isEditing) return;
    
    setIsEditing(true);
    
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL('image/png', 1.0); // Qualidade máxima
    const deviceInfo = getEnvironmentInfo();
    
    try {
      // Tentar salvar no servidor
      const editedPhoto = await PhotoService.saveEditedPhoto(photo, dataUrl, deviceInfo.deviceId);
      
      if (editedPhoto) {
        // Usar a foto editada do servidor
        onSave(editedPhoto);
      } else {
        // Fallback: atualizar a foto original com a versão editada
        const updatedPhoto: ProjectPhoto = {
          ...photo,
          url: dataUrl,
          editedAt: new Date().toISOString(),
          isEdited: true,
          deviceId: deviceInfo.deviceId,
          metadata: { 
            ...photo.metadata,
            editedLocally: true,
            lastEdit: new Date().toISOString()
          }
        };
        onSave(updatedPhoto);
      }
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      // Fallback: atualizar a foto original com a versão editada
      const updatedPhoto: ProjectPhoto = {
        ...photo,
        url: dataUrl,
        editedAt: new Date().toISOString(),
        isEdited: true,
        deviceId: deviceInfo.deviceId,
        metadata: { 
          ...photo.metadata,
          editedLocally: true,
          lastEdit: new Date().toISOString()
        }
      };
      onSave(updatedPhoto);
    } finally {
      setIsEditing(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/90 z-50" />
        <Dialog.Content 
          className="fixed inset-0 z-[100] flex flex-col bg-gray-900"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
            <Dialog.Title className="text-white font-medium text-sm">
              Image Editor
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-700/50 transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-3 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
            {/* Ferramentas e Cor */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setTool('freehand')}
                className={`p-2 rounded-lg transition-all ${
                  tool === 'freehand' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Pencil className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setTool('line')}
                className={`p-2 rounded-lg transition-all ${
                  tool === 'line' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Minus className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setTool('rectangle')}
                className={`p-2 rounded-lg transition-all ${
                  tool === 'rectangle' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Square className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setTool('circle')}
                className={`p-2 rounded-lg transition-all ${
                  tool === 'circle' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Circle className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setTool('text')}
                className={`p-2 rounded-lg transition-all ${
                  tool === 'text' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Type className="w-5 h-5" />
              </button>

              {/* Separador visual */}
              <div className="w-px h-8 bg-gray-600 mx-1" />

              {/* Seletor de Cor */}
              <div className="relative color-picker-container">
                <button
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors relative"
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: color }}
                  />
                  {/* Indicador de dropdown */}
                  <svg 
                    className={`w-2 h-2 text-white absolute -bottom-0.5 -right-0.5 transition-transform ${isColorPickerOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown de cores */}
                {isColorPickerOpen && (
                  <div className="absolute top-0 left-0 right-0 h-full bg-gray-800 rounded-xl p-3 shadow-2xl border border-gray-600 z-50 flex items-center justify-center">
                    <div className="flex gap-2">
                      {COLOR_PALETTE.map((paletteColor) => (
                        <button
                          key={paletteColor}
                          onClick={() => {
                            setColor(paletteColor);
                            setIsColorPickerOpen(false);
                          }}
                          className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                            color === paletteColor 
                              ? 'border-white scale-110 shadow-lg' 
                              : 'border-gray-500 hover:border-gray-300'
                          }`}
                          style={{ backgroundColor: paletteColor }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Controle de Espessura */}
              <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1">
                <Sliders className="w-4 h-4 text-gray-300" />
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value))}
                  className="w-20 accent-blue-600"
                />
                <span className="text-white text-xs w-4 text-center">{size}</span>
              </div>
            </div>


            {/* Text input (when text tool is selected) */}
            {tool === 'text' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type text here..."
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                />
              </div>
            )}
          </div>

          {/* Canvas Container */}
          <div 
            className="flex-1 overflow-hidden bg-black flex items-center justify-center p-2 relative"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="relative max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              onMouseDown={begin}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
                onTouchStart={begin}
                onTouchMove={move}
                onTouchEnd={end}
                className="border border-gray-600 rounded-lg touch-none"
                style={{ 
                  display: 'block',
                  background: 'white',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasScale})`,
                  transformOrigin: 'center center',
                  transition: (isDragging || isMouseDragging) ? 'none' : 'transform 0.2s ease-out'
                }}
              />
            </div>

            {/* Botões de Zoom - Canto inferior esquerdo */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
              <button
                onClick={zoomIn}
                className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg border border-gray-600"
                title="Zoom In"
              >
                <ZoomIn className="w-6 h-6" />
              </button>
              <button
                onClick={zoomOut}
                className="w-12 h-12 bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg border border-gray-600"
                title="Zoom Out"
              >
                <ZoomOut className="w-6 h-6" />
              </button>
            </div>

            {/* Botões de Ação - Canto inferior direito */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              <button
                onClick={undo}
                disabled={history.length === 0}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg border ${
                  history.length === 0
                    ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border-gray-700'
                    : 'bg-yellow-600/90 hover:bg-yellow-700/90 text-white border-yellow-500'
                }`}
                title="Undo"
              >
                <Undo2 className="w-6 h-6" />
              </button>
              <button
                onClick={reset}
                className="w-12 h-12 bg-orange-600/90 hover:bg-orange-700/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg border border-orange-500"
                title="Reset"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>

          </div>


          {/* Bottom Actions */}
          <div className="p-4 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 max-w-[150px] bg-gray-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-500 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={isEditing}
                className="flex-1 max-w-[150px] bg-green-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isEditing ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}


