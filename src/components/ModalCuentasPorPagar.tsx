import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, FileText, Info, Receipt, Clock } from "lucide-react";
import ImageDisplay from "./upfile/ImageDisplay";

interface CuentaPorPagar {
  _id: string;
  proveedor: string;
  descripcion: string;
  monto: number;
  divisa: string;
  tasa: number;
  numeroFactura: string;
  numeroControl: string;
  fechaEmision: string;
  diasCredito: number;
  estatus: string;
  farmacia: string;
  retencion: number;
  fechaRecepcion: string;
  fechaVencimiento?: string;
  fechaRegistro?: string;
  imagenesCuentaPorPagar?: string[];
  tipo?: string;
}

interface ModalCuentasPorPagarProps {
  cuentas: CuentaPorPagar[];
  farmaciaNombre: string;
  onConfirm: (cuentaId: string, nuevoEstatus: string) => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

const ModalCuentasPorPagar: React.FC<ModalCuentasPorPagarProps> = ({
  cuentas, farmaciaNombre, onConfirm, onClose, loading, error
}) => {

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">

        {/* Header con estilo Farmacia */}
        <div className="p-4 border-b border-blue-100 flex justify-between items-center bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-none">Cuentas por Pagar</h2>
              <p className="text-sm text-blue-600 font-semibold mt-1 uppercase tracking-wider">{farmaciaNombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Listado de Cuentas */}
        <div className="p-4 overflow-y-auto bg-slate-50 space-y-4">
          {loading ? (
            <div className="text-center py-20 text-slate-500">Cargando registros...</div>
          ) : error ? (
            <div className="text-center text-red-600 py-10 bg-red-50 rounded-lg">{error}</div>
          ) : (
            cuentas.map((c) => {
              // Lógica de Tasa: Calculamos ambos valores siempre
              const tasa = c.tasa || 1;
              const montoUSD = c.divisa === 'USD' ? c.monto : (c.monto / tasa);
              const montoBS = c.divisa === 'Bs' ? c.monto : (c.monto * tasa);
              const retencionUSD = c.divisa === 'USD' ? (c.retencion || 0) : ((c.retencion || 0) / tasa);
              const retencionBS = c.divisa === 'Bs' ? (c.retencion || 0) : ((c.retencion || 0) * tasa);

              return (
                <Card key={c._id} className="border-slate-200 shadow-md hover:border-blue-300 transition-all overflow-hidden bg-white">
                  {/* Título y Badge de Tipo */}
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-800 uppercase tracking-tight">Proveedor: {c.proveedor}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.tipo === 'traslado' ? 'bg-blue-600 text-white' :
                        c.tipo === 'pago_listo' ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                      {c.tipo?.replace('_', ' ') || 'Sin clasificar'}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      {/* Columna 1: Documentación */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-600">
                          <FileText size={16} className="text-blue-500" />
                          <p className="text-lg">Factura: <span className="font-bold text-slate-900">{c.numeroFactura}</span></p>
                        </div>
                        <p className="text-md text-slate-500 ml-6">N. Control: {c.numeroControl}</p>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Info size={16} className="text-slate-400" />
                          <p className="text-sm italic text-slate-500 leading-tight">"{c.descripcion}"</p>
                        </div>
                      </div>

                      {/* Columna 2: Fechas y Plazos */}
                      <div className="space-y-1.5 border-l border-slate-100 md:pl-6">
                        <div className="flex justify-between text-md text-slate-500">
                          <span>Emisión:</span> <span className="font-medium">{c.fechaEmision}</span>
                        </div>
                        <div className="flex justify-between text-md text-slate-500">
                          <span>Recepción:</span> <span className="font-medium text-blue-700">{c.fechaRecepcion}</span>
                        </div>
                        <div className="flex justify-between items-center text-md text-slate-500 pt-1 border-t border-slate-50">
                          <span>Vencimiento:</span> <span className="font-bold text-red-600">{c.fechaVencimiento?.slice(0, 10) || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded w-fit">
                          <Clock size={10} /> {c.diasCredito} Días de crédito
                        </div>
                      </div>

                      {/* Columna 3: Montos y Tasas */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                        <div className="text-right">
                          <p className="text-md text-slate-400 uppercase font-bold">Tasa: {tasa}</p>
                          <p className="text-xl font-bold text-green-700">Bs. {formatNumber(montoBS)}</p>
                          <p className="text-xl font-black text-slate-900 tracking-tight">$ {formatNumber(montoUSD)}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-200 text-right">
                          <p className="text-md text-blue-600 font-bold uppercase">Retención</p>
                          <p className="text-md font-semibold text-slate-600">Bs. {formatNumber(retencionBS)} / $ {formatNumber(retencionUSD)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Galería de Imágenes */}
                    {c.imagenesCuentaPorPagar && c.imagenesCuentaPorPagar.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap gap-2">
                          {c.imagenesCuentaPorPagar.map((img, idx) => (
                            <ImageDisplay
                              key={idx}
                              imageName={img}
                              alt="Comprobante"
                              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, cursor: 'zoom-in' }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botones de Acción */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        onClick={() => onConfirm(c._id, "verified")}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
                      >
                        Validar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCuentasPorPagar;