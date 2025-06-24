import React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { animate } from 'animejs';
import ImageDisplay from "./upfile/ImageDisplay";

interface PagosDropdownProps {
  cuentaId: string;
  onOpenChange: (open: boolean) => void;
  pagosInfo: { loading: boolean; error?: string; pagos?: any[] };
  // NUEVOS PROPS para info de la cuenta
  montoTotal: number;
  monedaCuenta: string;
  tasaCuenta: number;
}

const PagosDropdown: React.FC<PagosDropdownProps> = ({ cuentaId, onOpenChange, pagosInfo, montoTotal, monedaCuenta, tasaCuenta }) => {
  // Siempre trabajar en Bs como moneda principal
  // Convertir montoTotal y pagos a Bs para cálculos, pero mostrar referencia en USD

  // Monto total de la cuenta en Bs
  let montoTotalBs = monedaCuenta === 'USD' && tasaCuenta && tasaCuenta > 0
    ? montoTotal * tasaCuenta
    : montoTotal;
  // Monto total de la cuenta en USD (referencia)
  let montoTotalUSD = tasaCuenta && tasaCuenta > 0
    ? montoTotalBs / tasaCuenta
    : null;

  // Calcular total pagado y retención en Bs
  let totalPagadoBs = 0;
  let totalRetencionBs = 0;
  const pagosArray = pagosInfo?.pagos && Array.isArray(pagosInfo.pagos) ? pagosInfo.pagos : [];
  pagosArray.forEach(pago => {
    if (pago.moneda === 'USD' && pago.tasa && pago.tasa > 0) {
      totalPagadoBs += (pago.monto || 0) * pago.tasa;
      totalRetencionBs += (pago.retencion || 0) * pago.tasa;
    } else {
      totalPagadoBs += pago.monto || 0;
      totalRetencionBs += pago.retencion || 0;
    }
  });
  // Calcular pendiente en Bs
  const pendienteBs = montoTotalBs - totalPagadoBs - totalRetencionBs;
  // Pendiente en USD (referencia)
  const pendienteUSD = tasaCuenta && tasaCuenta > 0 ? pendienteBs / tasaCuenta : null;

  // Ref para animación
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (dropdownRef.current) {
      animate(dropdownRef.current, {
        opacity: [0, 1],
        translateY: [-16, 0],
        duration: 350,
        ease: 'outCubic'
      });
    }
  }, [pagosInfo?.pagos]);

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition text-xs font-medium border border-indigo-200">
          Ver pagos
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80" ref={dropdownRef} role="listbox" aria-label="Pagos registrados">
        <div className="mb-2 p-2 border-b border-slate-200">
          {/* Cabecera: siempre Bs y referencia en USD */}
          <div className="text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Monto cuenta:</span> {montoTotalBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: {montoTotalUSD != null ? montoTotalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) + ' USD' : '--'}
          </div>
          <div className="text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Total pagado:</span> {totalPagadoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: {tasaCuenta && tasaCuenta > 0 ? (totalPagadoBs / tasaCuenta).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) + ' USD' : '--'}
          </div>
          <div className="text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Deuda pendiente:</span> {pendienteBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: {pendienteUSD != null ? pendienteUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) + ' USD' : '--'}
          </div>
        </div>
        {/* REGISTRO DE PAGOS */}
        <div className="divide-y divide-slate-200">
          {pagosInfo?.loading ? (
            <div className="p-4 text-center text-slate-500 text-sm animate-pulse" aria-busy="true">
              <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
            </div>
          ) : pagosInfo?.error ? (
            <div className="p-4 text-center text-red-500 text-sm">
              {pagosInfo.error}
              <button className="ml-2 underline text-indigo-600 hover:text-indigo-800 text-xs" onClick={() => onOpenChange(true)}>Reintentar</button>
            </div>
          ) : pagosArray && pagosArray.length ? (
            pagosArray.map((pago, idx) => {
              // Mostrar monto original y conversión a Bs y USD
              let montoOriginal = pago.monto;
              let labelOriginal = pago.moneda === 'USD' ? 'USD' : 'Bs';
              let montoBs = pago.moneda === 'USD' && pago.tasa && pago.tasa > 0
                ? pago.monto * pago.tasa
                : pago.monto;
              let montoUSD = pago.moneda === 'Bs' && pago.tasa && pago.tasa > 0
                ? pago.monto / pago.tasa
                : pago.moneda === 'USD' ? pago.monto : null;
              return (
                <div key={pago._id || idx} className={`pagos-dropdown-item-${cuentaId} px-3 py-2 text-xs text-slate-700 relative bg-white`} role="option" aria-selected="false">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-green-700">
                      {montoOriginal != null && !isNaN(montoOriginal)
                        ? `${montoOriginal.toLocaleString(labelOriginal === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: labelOriginal === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })} ${labelOriginal}`
                        : '--'}
                    </span>
                    <span className="text-[11px] text-slate-500 italic">
                      {pago.moneda === 'USD' && pago.tasa && pago.tasa > 0
                        ? `${montoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${pago.monto.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(pago.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                        : pago.moneda === 'Bs' && pago.tasa && pago.tasa > 0 && montoUSD != null
                          ? `${montoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${montoUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(pago.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                          : `${montoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs`}
                    </span>
                  </div>
                  <div className="text-slate-600">Referencia: {pago.referencia}</div>
                  <div className="text-slate-400 text-[11px]">Moneda: <span className="font-semibold">{pago.moneda || '--'}</span> | Tasa: <span className="font-semibold">{pago.tasa ? Number(pago.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '--'}</span></div>
                  {pago.retencion !== undefined && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500">
                        {pago.retencion != null && !isNaN(pago.retencion)
                          ? `Retención: ${pago.retencion.toLocaleString(labelOriginal === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: labelOriginal === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })} ${labelOriginal}`
                          : '--'}
                      </span>
                      <span className="text-[11px] text-slate-400 italic">
                        {pago.moneda === 'USD' && pago.tasa && pago.tasa > 0
                          ? `${(pago.retencion * pago.tasa).toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${pago.retencion.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(pago.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                          : pago.moneda === 'Bs' && pago.tasa && pago.tasa > 0 && pago.retencion != null
                            ? `${pago.retencion.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${(pago.retencion / pago.tasa).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(pago.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                            : `${pago.retencion.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs`}
                      </span>
                    </div>
                  )}
                  <div className="text-slate-500">Banco Emisor: {pago.bancoEmisor} | Banco Receptor: {pago.bancoReceptor}</div>
                  <div className="text-slate-400">Fecha: {pago.fecha}</div>
                  {pago.imagenPago && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="border border-slate-200 rounded shadow-sm overflow-hidden bg-slate-50 p-1">
                      <ImageDisplay
                        imageName={pago.imagenPago}
                        alt="Comprobante de pago"
                        style={{
                        maxWidth: 120,
                        maxHeight: 60,
                        borderRadius: 4,
                        objectFit: 'cover',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        }}
                      />
                      </div>
                      <span className="text-[10px] text-slate-400">Comprobante</span>
                    </div>
                  )}
                  <div className="text-slate-400 text-[11px]">Usuario: {pago.usuario || '--'}</div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs">Sin pagos registrados</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PagosDropdown;
