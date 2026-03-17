import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImageDisplay from "@/components/upfile/ImageDisplay";
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Calendar, 
  Receipt, 
  Maximize2, 
  Clock, 
  AlertCircle,
  LayoutList,
  DollarSign,
  TrendingUp
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  nombreLocalidad: string;
  gastos: any[];
  onActualizar: (id: string, estado: string) => void;
  onEliminar: (id: string) => void;
}

const ModalDetallesGastos: React.FC<Props> = ({ 
  open, 
  onClose, 
  nombreLocalidad, 
  gastos, 
  onActualizar, 
  onEliminar 
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      {/* VISOR DE IMAGEN (TOP LAYER) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-6 right-6 text-white hover:text-red-500 bg-white/10 p-2 rounded-full transition-colors">
            <X className="w-8 h-8" />
          </button>
          <ImageDisplay 
            imageName={selectedImage} 
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} 
          />
        </div>
      )}

      {/* OVERLAY MODAL */}
      <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300 overflow-y-auto">
        
        {/* CONTENEDOR PRINCIPAL */}
        <div 
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl my-4 sm:my-8 flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* HEADER */}
          <div className="bg-red-600 p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl">
                <LayoutList className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Verificar Gastos</h2>
                <p className="text-red-100 text-xs font-bold uppercase tracking-widest flex items-center gap-1 opacity-90">
                  <AlertCircle className="w-3.5 h-3.5" /> {nombreLocalidad}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-90"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* LISTADO DE GASTOS (SCROLLABLE) */}
          <div className="p-4 sm:p-6 bg-slate-50 flex-1 space-y-8 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 80px)' }}>
            {gastos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                <CheckCircle2 className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-bold">No hay gastos pendientes en esta sede.</p>
                <p className="text-sm">Todos los registros han sido procesados.</p>
              </div>
            ) : (
              gastos.map((gasto) => {
                const tasa = Number(gasto.tasa) || 0;
                const isBs = gasto.divisa === "Bs";
                const montoEquiv = isBs ? gasto.monto / (tasa || 1) : gasto.monto * tasa;

                return (
                  <Card key={gasto._id} className="overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white rounded-3xl">
                    
                    {/* ENCABEZADO DE LA TARJETA (Metadata) */}
                    <div className="bg-slate-50 px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5 text-red-400" /> Gasto: {gasto.fecha}
                      </span>
                      {gasto.fechaRegistro && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ml-auto">
                          <Clock className="w-3.5 h-3.5" /> Registrado: {new Date(gasto.fechaRegistro).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* COLUMNA 1 & 2: DESCRIPCIÓN E IMÁGENES */}
                        <div className="md:col-span-2 space-y-5">
                          <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                              <Receipt className="w-5 h-5 text-red-500" /> {gasto.titulo}
                            </h3>
                            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                              {gasto.descripcion}
                            </p>
                          </div>

                          {/* IMÁGENES */}
                          {Array.isArray(gasto.imagenesGasto) && gasto.imagenesGasto.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Evidencia Adjunta ({gasto.imagenesGasto.length})</p>
                              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {gasto.imagenesGasto.map((img: any, i: any) => (
                                  <div 
                                    key={i} 
                                    className="relative group cursor-zoom-in min-w-[90px] h-[90px]"
                                    onClick={() => setSelectedImage(img)}
                                  >
                                    <ImageDisplay 
                                      imageName={img} 
                                      style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '14px', border: '2px solid #f1f5f9' }} 
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all rounded-[14px] flex items-center justify-center backdrop-blur-[1px]">
                                      <Maximize2 className="text-white w-5 h-5" />
                                    </div>
                                  </div>
                                )).reverse()} {/* Mostrar las más recientes primero si aplica */}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* COLUMNA 3: DESGLOSE FINANCIERO Y ACCIONES (FONDO CLARO) */}
                        <div className="space-y-4">
                          
                          {/* PANEL FINANCIERO (CLARO) */}
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-inner space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-50 rounded-lg text-red-600">
                                  <DollarSign className="w-4 h-4" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Monto</p>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-950">{gasto.monto.toLocaleString('es-VE')}</span>
                                <span className="text-sm font-bold text-red-600">{gasto.divisa}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                                  <TrendingUp className="w-4 h-4" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Conversión</p>
                              </div>
                              <span className="text-lg font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                                {isBs ? `$${montoEquiv.toFixed(2)}` : `${montoEquiv.toLocaleString('es-VE')} Bs`}
                              </span>
                            </div>
                            
                            {tasa > 0 && (
                              <div className="text-sm text-right font-medium italic pt-1">
                                Tasa: {tasa} Bs/$
                              </div>
                            )}
                          </div>
                          
                          {/* BOTONES ACCIÓN */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <Button 
                              onClick={() => onActualizar(gasto._id, "verified")} 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl h-12 shadow-lg shadow-emerald-100 transition-all active:scale-95 text-xs gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> VERIFICAR
                            </Button>
                            <Button 
                              onClick={() => onActualizar(gasto._id, "denied")} 
                              className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl h-12 shadow-lg shadow-red-100 transition-all active:scale-95 text-xs gap-1.5"
                            >
                              <XCircle className="w-4 h-4" /> DENEGAR
                            </Button>
                          </div>
                          <Button 
                            onClick={() => onEliminar(gasto._id)} 
                            variant="ghost" 
                            className="w-full text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 transition-all text-xs font-semibold"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar de la lista
                          </Button>
                        </div>

                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* FOOTER DEL MODAL */}
          <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
            <Button 
              onClick={onClose} 
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-10 py-2 rounded-2xl transition-all"
            >
              Cerrar Vista
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalDetallesGastos;