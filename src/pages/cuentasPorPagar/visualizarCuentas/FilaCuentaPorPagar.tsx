import React, { useState } from "react";
import PagosDropdown from "@/components/PagosDropdown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FaCoins, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ImageDisplay from "@/components/upfile/ImageDisplay";

// Tipos para mayor robustez y autocompletado
export interface Pago {
  _id: string;
  monto: number;
  moneda: string;
  tasa?: number;
  fecha: string;
  usuario: string;
  [key: string]: any;
}

export interface CuentaPorPagar {
  _id: string;
  monto: number;
  divisa: string;
  tasa: number;
  retencion?: number;
  fechaEmision: string;
  diasCredito: number;
  fechaRecepcion: string;
  proveedor: string;
  numeroFactura: string;
  numeroControl: string;
  descripcion: string;
  usuarioCorreo: string;
  farmacia: string;
  estatus: string;
  [key: string]: any;
}

interface FilaCuentaPorPagarProps {
  cuenta: CuentaPorPagar;
  pagosAprobadosPorCuenta: Record<string, { loading: boolean; pagos: Pago[] }>;
  cuentasParaPagar: Record<string, any>; // Nuevo: objeto centralizado de cuentas seleccionadas y editadas
  handleToggleCuentaParaPagar: (cuenta: CuentaPorPagar) => void; // Nuevo: agrega o quita la cuenta del objeto central
  isValidPagosInfo: (pagosInfo: any) => boolean;
  handlePagosDropdownOpen: (open: boolean, cuenta: CuentaPorPagar) => void;
  handleEstadoChange: (id: string, value: string) => void;
  ESTATUS_OPCIONES: string[];
  formatFecha: (fecha: string) => string;
  abrirEdicionCuenta: (cuentaId: string) => void;
}

const EstatusBadge: React.FC<{ estatus: string }> = ({ estatus }) => {
  let color = 'bg-slate-300 text-slate-700';
  if (estatus === 'anulada') color = 'bg-red-100 text-red-600';
  else if (estatus === 'pagada') color = 'bg-green-100 text-green-600';
  else if (estatus === 'pendiente') color = 'bg-yellow-100 text-yellow-700';
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>{estatus.charAt(0).toUpperCase() + estatus.slice(1)}</span>
  );
};

const FilaCuentaPorPagar: React.FC<FilaCuentaPorPagarProps> = ({
  cuenta: c,
  pagosAprobadosPorCuenta,
  cuentasParaPagar = {},
  handleToggleCuentaParaPagar,
  isValidPagosInfo,
  handlePagosDropdownOpen,
  handleEstadoChange,
  ESTATUS_OPCIONES,
  formatFecha,
  abrirEdicionCuenta
}) => {
  // Protección extra: si cuentasParaPagar es null/undefined, usa objeto vacío
  const cuentasParaPagarSafe = cuentasParaPagar || {};
  const isSelected = !!cuentasParaPagarSafe[c._id];
  // Si la cuenta está seleccionada, usa los datos editados, si no, los originales
  const cuentaData = cuentasParaPagarSafe[c._id] ? { ...c, ...cuentasParaPagarSafe[c._id] } : c;

  // Handler para seleccionar la fila completa (excepto si es pagada o el click viene de un control interno)
  const handleRowClick = (e: React.MouseEvent) => {
    // Evita seleccionar si el click viene de un botón, input, select, a, svg, path
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (["button", "input", "select", "a", "svg", "path", "textarea"].includes(tag)) return;
    if (cuentaData.estatus === 'pagada') return;
    handleToggleCuentaParaPagar(cuentaData);
  };

  // Modal para ver imágenes de la cuenta por pagar
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const imagenes = Array.isArray(c.imagenesCuentaPorPagar) ? c.imagenesCuentaPorPagar : [];

  const openImagesModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIdx(0);
    setShowImagesModal(true);
  };
  const closeImagesModal = () => setShowImagesModal(false);
  const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIdx(idx => (idx > 0 ? idx - 1 : imagenes.length - 1)); };
  const goNext = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImageIdx(idx => (idx < imagenes.length - 1 ? idx + 1 : 0)); };

  return (
    <>
      <tr
        className={`transition-colors duration-200 ${isSelected ? 'bg-yellow-50' : 'hover:bg-yellow-50'} cursor-pointer`}
        onClick={handleRowClick}
      >
        <td className="px-2 py-4 text-center flex items-center gap-2 justify-center">
          <button
            className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 shadow focus:outline-none focus:ring-2 focus:ring-yellow-400"
            title="Preliminar de pago"
            onClick={e => { e.stopPropagation(); abrirEdicionCuenta(cuentaData._id); }}
            type="button"
            disabled={cuentaData.estatus === 'pagada'}
            style={cuentaData.estatus === 'pagada' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <FaCoins size={18} />
          </button>
          <input
            type="checkbox"
            checked={isSelected}
            onClick={e => e.stopPropagation()}
            onChange={() => {
              if (typeof handleToggleCuentaParaPagar === 'function') {
                handleToggleCuentaParaPagar(cuentaData);
              } else {
                console.error('handleToggleCuentaParaPagar no es una función');
              }
            }}
            className="ml-2"
            disabled={cuentaData.estatus === 'pagada'}
          />
        </td>
        <td className="px-2 py-4 text-center">
          {imagenes.length > 0 && (
            <button
              className="px-2 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600 text-xs font-semibold shadow flex items-center gap-1"
              onClick={openImagesModal}
              title="Ver imágenes de factura"
              type="button"
            >Ver Factura
            </button>
          )}
        </td>
        <td className="px-2 py-4 whitespace-nowrap text-sm">
          {(() => {
            let pagosInfo = pagosAprobadosPorCuenta[c._id] || { loading: false, pagos: [] };
            if (!isValidPagosInfo(pagosInfo)) {
              return (
                <div className="text-xs text-red-500 font-semibold">Error: pagosInfo inválido</div>
              );
            }
            if (pagosInfo.pagos && Array.isArray(pagosInfo.pagos)) {
              pagosInfo = {
                ...pagosInfo,
                pagos: pagosInfo.pagos.map((p: Pago) => {
                  let monedaPago = (typeof p.moneda === 'string' && p.moneda.trim()) ? p.moneda.toUpperCase() : (typeof c.divisa === 'string' ? c.divisa.toUpperCase() : 'BS');
                  return {
                    ...p,
                    moneda: monedaPago,
                    tasa: p.tasa || c.tasa,
                    monedaCuenta: typeof c.divisa === 'string' ? c.divisa.toUpperCase() : 'BS',
                    tasaCuenta: c.tasa,
                    montoTotal: c.monto
                  };
                })
              };
            }
            return (
              <PagosDropdown
                cuentaId={c._id}
                onOpenChange={open => handlePagosDropdownOpen(open, c)}
                pagosInfo={pagosInfo}
                montoTotal={c.monto}
                monedaCuenta={c.divisa}
                tasaCuenta={c.tasa}
              />
            );
          })()}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
          <div className="font-bold text-indigo-700">
            {(() => {
              // Mostrar monto original en Bs, 4 decimales
              const montoBs = c.divisa === 'USD' ? c.monto * (c.tasa || 0) : c.monto;
              return montoBs != null && !isNaN(montoBs)
                ? montoBs.toLocaleString('es-VE', { style: 'decimal', minimumFractionDigits: 4, maximumFractionDigits: 4 })
                : '--';
            })()}
          </div>
          <div className="text-xs text-slate-500 italic">
            {(() => {
              // Mostrar monto original en USD, 4 decimales
              const montoUSD = c.divisa === 'USD' ? c.monto : c.tasa ? c.monto / c.tasa : null;
              return montoUSD != null && !isNaN(montoUSD)
                ? `Ref: $${montoUSD.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                : 'Ref: --';
            })()}
          </div>
        </td>
        {/* Celda de retención (quinto) */}
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
          <div className="font-bold text-indigo-700">
            {(() => {
              // Mostrar retención en Bs, 4 decimales
              const retencionBs = c.divisa === 'USD' ? (c.retencion || 0) * (c.tasa || 0) : c.retencion || 0;
              return c.retencion != null && !isNaN(retencionBs)
                ? retencionBs.toLocaleString('es-VE', { style: 'decimal', minimumFractionDigits: 4, maximumFractionDigits: 4 })
                : '--';
            })()}
          </div>
          <div className="text-xs text-slate-500 italic">
            {(() => {
              // Mostrar retención en USD, 4 decimales
              let retencionUSD: number | null = null;
              if (c.retencion != null) {
                retencionUSD = c.divisa === 'USD' ? c.retencion : c.tasa ? (c.retencion || 0) / c.tasa : null;
              }
              return retencionUSD != null && !isNaN(retencionUSD)
                ? `Ref: $${retencionUSD.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                : 'Ref: --';
            })()}
          </div>
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-center">
          {c.tasa}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-center">
          {c.divisa}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-center">
          {(() => {
            const fechaVencimiento = new Date(new Date(c.fechaEmision).getTime() + c.diasCredito * 24 * 60 * 60 * 1000);
            const hoy = new Date();
            const diasParaVencer = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            return diasParaVencer <= 0 ? (
              <span className="text-red-600 font-bold">Vencida</span>
            ) : (
              <span className="text-slate-700 font-semibold">{diasParaVencer} días</span>
            );
          })()}
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{formatFecha(c.fechaRecepcion)}</td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{c.proveedor}</td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.numeroFactura}</td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.numeroControl}</td>
        <td className="px-5 py-4 text-sm text-slate-700 max-w-sm truncate">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer underline decoration-dotted" tabIndex={0}>
                  {c.descripcion.length > 50 ? c.descripcion.slice(0, 50) + '…' : c.descripcion}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="max-w-xs break-words whitespace-pre-line bg-white border border-slate-200 shadow-lg p-4 rounded-md text-slate-800 text-sm font-normal">
                {c.descripcion}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.usuarioCorreo}</td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.farmacia}</td>
        <td className="px-5 py-4 whitespace-nowrap text-sm"><EstatusBadge estatus={c.estatus} /></td>
        <td className="px-5 py-4 whitespace-nowrap text-sm text-center">
          <select
            value={c.estatus}
            onChange={e => handleEstadoChange(c._id, e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700"
          >
            {ESTATUS_OPCIONES.map(opt => (
              <option key={opt} value={opt} disabled={opt === c.estatus}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        </td>
      </tr>
      {/* Modal de imágenes */}
      {showImagesModal && imagenes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-70" onClick={closeImagesModal}>
          <div className="bg-white rounded-xl shadow-2xl p-6 relative flex flex-col items-center max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-3 text-2xl text-gray-500 hover:text-red-600 font-bold" onClick={closeImagesModal}>&times;</button>
            <div className="mb-2 text-center text-lg font-semibold text-indigo-700">Factura: {c.numeroFactura}</div>
            <div className="flex items-center justify-center gap-4">
              {imagenes.length > 1 && (
                <button onClick={goPrev} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-indigo-700"><FaChevronLeft /></button>
              )}
              <ImageDisplay imageName={imagenes[currentImageIdx]} alt={`Factura ${currentImageIdx + 1}`} style={{ maxWidth: 350, maxHeight: 350, borderRadius: 8, border: '1px solid #ccc', boxShadow: '0 1px 4px #0002' }} />
              {imagenes.length > 1 && (
                <button onClick={goNext} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-indigo-700"><FaChevronRight /></button>
              )}
            </div>
            {imagenes.length > 1 && (
              <div className="mt-2 text-xs text-gray-600">Imagen {currentImageIdx + 1} de {imagenes.length}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FilaCuentaPorPagar;
