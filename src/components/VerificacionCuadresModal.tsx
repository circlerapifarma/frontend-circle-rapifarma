import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImageDisplay from "./upfile/ImageDisplay";
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Monitor, 
  CreditCard, 
  PackageSearch,
  Maximize2
} from "lucide-react";

interface CuadreCaja {
  _id: string;
  dia: string;
  cajaNumero: number;
  tasa: number;
  turno: string;
  cajero: string;
  totalCajaSistemaBs: number;
  devolucionesBs: number;
  recargaBs: number;
  pagomovilBs: number;
  puntosVenta?: Array<{ banco: string; puntoDebito: number; puntoCredito: number }>;
  efectivoBs: number;
  totalBs: number;
  totalBsEnUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  valesUsd?: number;
  totalGeneralUsd: number;
  diferenciaUsd: number;
  sobranteUsd?: number;
  faltanteUsd?: number;
  delete: boolean;
  estado?: string;
  nombreFarmacia?: string;
  codigoFarmacia?: string;
  costoInventario?: number;
  fecha?: string;
  hora?: string;
  imagenesCuadre?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  farmaciaId: string;
  farmaciaNombre: string;
  soloDenegar?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VerificacionCuadresModal: React.FC<Props> = ({ open, onClose, farmaciaId, farmaciaNombre, soloDenegar }) => {
  const [cuadres, setCuadres] = useState<CuadreCaja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para la imagen en pantalla grande
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !farmaciaId) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/cuadres?farmacia=${farmaciaId}&estado=wait`)
      .then(res => res.json())
      .then(data => setCuadres(data))
      .catch(() => setError("Error al cargar cuadres"))
      .finally(() => setLoading(false));
  }, [open, farmaciaId]);

  const actualizarEstado = async (cuadre: CuadreCaja, nuevoEstado: "verified" | "denied") => {
    if (!farmaciaId || !cuadre._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cuadres/${farmaciaId}/${cuadre._id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error();
      setCuadres(prev => prev.filter(c => c._id !== cuadre._id));
    } catch {
      alert("No se pudo actualizar el estado");
    }
  };

  if (!open) return null;

  return (
    <>
      {/* VISOR DE IMAGEN (FULLSCREEN) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors bg-white/10 p-2 rounded-full">
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
            <ImageDisplay 
              imageName={selectedImage} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 0 50px rgba(0,0,0,0.5)'
              }} 
            />
          </div>
        </div>
      )}

      {/* MODAL PRINCIPAL */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
          
          <div className="bg-blue-700 p-5 flex justify-between items-center text-white">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                <CheckCircle2 className="w-6 h-6" /> Verificación de Cuadres
              </h2>
              <p className="text-blue-100 text-xs font-medium uppercase tracking-widest">{farmaciaNombre}</p>
            </div>
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors" onClick={onClose}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 flex-1">
            {loading ? (
              <div className="text-center py-20 animate-pulse text-slate-400 font-medium">Obteniendo registros...</div>
            ) : error ? (
              <div className="text-center py-20 text-red-500 font-bold">{error}</div>
            ) : cuadres.length === 0 ? (
              <div className="text-center py-20 text-slate-500">No hay cuadres pendientes de verificación.</div>
            ) : (
              <div className="grid gap-8">
                {cuadres.map((c) => (
                  <Card key={c._id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                    {/* Header Datos */}
                    <div className="bg-slate-100 px-4 py-3 flex flex-wrap gap-4 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.dia}</span>
                      <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Caja {c.cajaNumero}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.turno}</span>
                      <span className="flex items-center gap-1 ml-auto"><User className="w-3 h-3" /> {c.cajero}</span>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Bs */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase border-b pb-1 mb-2">Bolívares (Bs)</h4>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Sistema:</span> <b>{c.totalCajaSistemaBs}</b></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Pago Móvil:</span> <b>{c.pagomovilBs}</b></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Recarga:</span> <b>{c.recargaBs}</b></div>
                        <div className="flex justify-between text-sm border-t pt-1 font-bold"><span>Efectivo:</span> <span>{c.efectivoBs}</span></div>
                      </div>

                      {/* USD */}
                      <div className="space-y-2 md:border-x px-0 md:px-4">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-1 mb-2">Divisas (USD)</h4>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Efectivo:</span> <b className="text-emerald-700">${c.efectivoUsd}</b></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Zelle:</span> <b className="text-emerald-700">${c.zelleUsd}</b></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Vales:</span> <b className="text-amber-700">${c.valesUsd ?? '-'}</b></div>
                        <div className="flex justify-between text-sm border-t pt-1 font-bold"><span>Tasa:</span> <span>{c.tasa}</span></div>
                      </div>

                      {/* Final */}
                      <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase border-b pb-1 mb-2">Resultado</h4>
                        <div className="flex justify-between text-sm font-bold"><span>Total USD:</span> <span className="text-blue-700">${c.totalGeneralUsd}</span></div>
                        <div className="flex justify-between text-sm"><span>Diferencia:</span> <span>${c.diferenciaUsd}</span></div>
                        {c.sobranteUsd! > 0 && <div className="text-[11px] font-bold text-green-700 bg-green-100 p-1 rounded text-center">SOBRANTE: ${c.sobranteUsd}</div>}
                        {c.faltanteUsd! > 0 && <div className="text-[11px] font-bold text-red-700 bg-red-100 p-1 rounded text-center">FALTANTE: ${c.faltanteUsd}</div>}
                        <div className="text-sm text-black pt-1 text-center">Devoluciones: {c.devolucionesBs} Bs</div>
                      </div>
                    </div>

                    {/* Puntos y Metadata */}
                    <div className="px-5 pb-5">
                      {c.puntosVenta && c.puntosVenta.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Puntos de Venta</p>
                          <div className="grid grid-cols-2 gap-x-4 text-[11px]">
                            {c.puntosVenta.map((pv, i) => (
                              <div key={i} className="flex justify-between border-b border-blue-100 py-0.5">
                                <span className="text-slate-500">{pv.banco}</span>
                                <span className="font-bold">Debito: {pv.puntoDebito} | Credito: {pv.puntoCredito}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm mb-4 items-center">
                        <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border"><PackageSearch className="w-3 h-3" /> Costo: {c.costoInventario ?? 'N/A'}</span>
                        <span>Registro: {c.fecha} {c.hora}</span>
                        <span className="font-bold text-blue-600 uppercase">Estado: {c.estado}</span>
                      </div>

                      {/* GALERÍA DE IMÁGENES CON CLICK PARA AGRANDAR */}
                      {Array.isArray(c.imagenesCuadre) && c.imagenesCuadre.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Soportes (Click para ampliar)</p>
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {c.imagenesCuadre.map((img, idx) => (
                              <div 
                                key={img || idx} 
                                className="relative group cursor-zoom-in min-w-[100px] h-[100px]"
                                onClick={() => setSelectedImage(img)}
                              >
                                <ImageDisplay 
                                  imageName={img} 
                                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #e2e8f0' }} 
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors rounded-xl flex items-center justify-center">
                                  <Maximize2 className="text-white w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6 border-t pt-5">
                        {!soloDenegar && (
                          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl font-bold shadow-lg shadow-blue-100" onClick={() => actualizarEstado(c, "verified")}>Verificar</Button>
                        )}
                        <Button variant="outline" className={`h-11 rounded-xl font-bold text-red-600 border-red-100 hover:bg-red-50 ${soloDenegar ? 'flex-1' : 'w-1/3'}`} onClick={() => actualizarEstado(c, "denied")}>Denegar</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default VerificacionCuadresModal;