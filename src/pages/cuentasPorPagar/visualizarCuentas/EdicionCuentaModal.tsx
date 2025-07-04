import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { animate, stagger } from 'animejs';
import type { CuentaCompletaEdicion } from './type';

// Nuevo: tipo para pagos previos
interface PagoPrevio {
  _id: string;
  monto: number;
  moneda: string;
  tasa?: number;
  fecha: string;
  referencia: string;
}

interface EdicionCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuenta: CuentaCompletaEdicion | undefined;
  // Nuevo: pagos previos
  pagosPrevios?: PagoPrevio[];
}

// Helper para inicializar el monto en la divisa seleccionada
function getMontoEditadoInicial(cuenta: CuentaCompletaEdicion) {
  if (!cuenta || !cuenta.montoEditado || !cuenta.moneda || !cuenta.tasaPago) return cuenta.montoEditado;
  if (cuenta.divisa !== cuenta.moneda) {
    if (cuenta.moneda === 'USD') {
      return Number((cuenta.montoEditado / cuenta.tasaPago).toFixed(4));
    } else if (cuenta.moneda === 'Bs') {
      return Number((cuenta.montoEditado * cuenta.tasaPago).toFixed(2));
    }
  }
  return cuenta.montoEditado;
}

// Helper para inicializar el estado editable desde la cuenta base
function getInitialCuentaEditada(cuenta: CuentaCompletaEdicion) {
  // Si ya tiene campos de edición, respétalos
  if (cuenta.moneda && cuenta.montoEditado !== undefined && cuenta.tasaPago) {
    return {
      ...cuenta,
      montoEditado: getMontoEditadoInicial(cuenta)
    };
  }
  // Si viene solo la cuenta base (sin edición), inicializar campos de edición
  const moneda = cuenta.divisa === 'USD' ? 'USD' : 'Bs';
  const tasaPago = cuenta.tasa;
  let montoEditado = cuenta.monto;
  if (moneda === 'Bs' && cuenta.divisa === 'USD') {
    montoEditado = Number((cuenta.monto * tasaPago).toFixed(2));
  } else if (moneda === 'USD' && cuenta.divisa === 'Bs') {
    montoEditado = Number((cuenta.monto / tasaPago).toFixed(4));
  }
  return {
    ...cuenta,
    moneda,
    tasaPago,
    montoEditado,
    descuento1: 0,
    tipoDescuento1: 'monto',
    descuento2: 0,
    tipoDescuento2: 'monto',
    observacion: '',
    esAbono: false,
    retencion: cuenta.retencion || 0,
  };
}

const EdicionCuentaModal: React.FC<EdicionCuentaModalProps> = ({
  isOpen,
  onClose,
  cuenta,
  pagosPrevios = [], // Nuevo: default vacío
}) => {
  if (!isOpen || !cuenta) return null;

  // Usar helper robusto para inicializar el estado editable
  const [cuentaEditada, setCuentaEditada] = React.useState(getInitialCuentaEditada(cuenta));

  // Refrescar estado local si cambia la cuenta base
  React.useEffect(() => {
    setCuentaEditada(getInitialCuentaEditada(cuenta));
  }, [cuenta]);

  // Ref: para forzar focus tras cambio de moneda
  const montoInputRef = React.useRef<HTMLInputElement>(null);
  const monedaAnterior = React.useRef<string>(cuentaEditada.moneda);

  // Función para convertir montoEditado según moneda
  function convertirMontoEditado(monto: number, monedaOrigen: string, monedaDestino: string, tasa: number) {
    if (!monto || !tasa || tasa <= 0) return monto;
    if (monedaOrigen === monedaDestino) return monto;
    if (monedaDestino === 'USD') {
      return Number((monto / tasa).toFixed(4));
    } else if (monedaDestino === 'Bs') {
      return Number((monto * tasa).toFixed(2));
    }
    return monto;
  }

  // Efecto: enfocar input de monto cuando cambia la moneda
  React.useEffect(() => {
    if (monedaAnterior.current !== cuentaEditada.moneda) {
      setTimeout(() => {
        if (montoInputRef.current) montoInputRef.current.focus();
      }, 0);
      monedaAnterior.current = cuentaEditada.moneda;
    }
  }, [cuentaEditada.moneda]);

  // Calcular total pagado previo en la moneda seleccionada
  const totalPagadoPrevioEnMoneda = pagosPrevios.reduce((acc, pago) => {
    if (cuentaEditada.moneda === 'USD') {
      // Convertir todos los pagos a USD
      if (pago.moneda === 'USD') {
        return acc + pago.monto;
      } else if (pago.moneda === 'Bs' && pago.tasa && pago.tasa > 0) {
        // Si el pago fue en Bs, convertir a USD usando la tasa del pago
        return acc + pago.monto / pago.tasa;
      } else if (pago.moneda === 'Bs' && cuentaEditada.tasaPago && cuentaEditada.tasaPago > 0) {
        // Si no hay tasa en el pago, usar la tasa actual
        return acc + pago.monto / cuentaEditada.tasaPago;
      } else {
        return acc;
      }
    } else {
      // Convertir todos los pagos a Bs
      if (pago.moneda === 'Bs') {
        return acc + pago.monto;
      } else if (pago.moneda === 'USD' && pago.tasa && pago.tasa > 0) {
        // Si el pago fue en USD, convertir a Bs usando la tasa del pago
        return acc + pago.monto * pago.tasa;
      } else if (pago.moneda === 'USD' && cuentaEditada.tasaPago && cuentaEditada.tasaPago > 0) {
        // Si no hay tasa en el pago, usar la tasa actual
        return acc + pago.monto * cuentaEditada.tasaPago;
      } else {
        return acc;
      }
    }
  }, 0);

  // Manejar cambios de input
  const handleChange = (field: keyof typeof cuentaEditada) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let value: any = e.target.value;
    if (e.target.type === 'number') value = e.target.value === '' ? undefined : Number(value);
    if (e.target.type === 'checkbox') value = (e.target as HTMLInputElement).checked;
    let next = { ...cuentaEditada, [field]: value };

    // Si cambia la moneda, recalcular montoEditado usando la función aparte
    if (field === 'moneda') {
      if (cuentaEditada.montoEditado && cuentaEditada.tasaPago && cuentaEditada.tasaPago > 0) {
        next.montoEditado = convertirMontoEditado(cuentaEditada.montoEditado, cuentaEditada.moneda, value, cuentaEditada.tasaPago);
      } else if (cuentaEditada.monto && cuentaEditada.tasaPago && cuentaEditada.tasaPago > 0) {
        // Si no hay montoEditado, usar el monto original
        next.montoEditado = convertirMontoEditado(cuentaEditada.monto, cuentaEditada.divisa, value, cuentaEditada.tasaPago);
      }
    }
    setCuentaEditada(next);
  };

  // Guardar cambios en localStorage
  const handleGuardar = () => {
    try {
      const stored = localStorage.getItem('cuentasParaPagar');
      const cuentas = stored ? JSON.parse(stored) : {};
      cuentas[cuentaEditada._id] = { ...cuentaEditada };
      localStorage.setItem('cuentasParaPagar', JSON.stringify(cuentas));
    } catch {}
    onClose();
  };

  // Animación de fade-in para la lista de pagos previos
  React.useEffect(() => {
    if (isOpen && pagosPrevios.length > 0) {
      animate('.pagos-previos-lista li', {
        opacity: [0, 1],
        y: [20, 0],
        duration: 500,
        delay: stagger(80),
        ease: 'outCubic',
      });
    }
  }, [isOpen, pagosPrevios.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50" onClick={onClose}>
      <div className="bg-slate-50 rounded-lg shadow-xl p-6 w-full max-w-3xl relative" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
          <FaTimes size={20} />
        </button>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Pagos o Abonos</h2>
          <p className="text-sm text-slate-600">Proveedor: <span className="font-semibold">{cuenta.proveedor}</span></p>
        </div>
        {/* Pagos previos en la parte superior */}
        {pagosPrevios.length > 0 && (
          <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-700 mb-2 text-sm">Pagos realizados anteriormente</h4>
            <div className="text-xs text-slate-600 mb-1">
              Total pagado previo: <span className="font-semibold">
                {cuenta.moneda === 'USD'
                  ? totalPagadoPrevioEnMoneda.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) + ' USD'
                  : totalPagadoPrevioEnMoneda.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }) + ' Bs'}
              </span>
            </div>
            <ul className="divide-y divide-slate-200 pagos-previos-lista">
              {pagosPrevios.map(p => (
                <li key={p._id} className="py-1 flex flex-col">
                  <span className="text-slate-700">{p.monto.toLocaleString(p.moneda === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: p.moneda === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })} {p.moneda}</span>
                  <span className="text-slate-400 text-xs">Ref: {p.referencia} | Fecha: {p.fecha} | Tasa: {p.tasa ? p.tasa.toLocaleString('es-VE', { minimumFractionDigits: 4 }) : 'N/A'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna de Inputs */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Detalles del Pago</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto Original</label>
                <input type="number" className="w-full border rounded px-3 py-2 bg-slate-100" value={cuenta.monto} disabled />
                <div className="text-xs text-slate-500 mt-1">
                  {/* Mostrar monto original en ambas monedas */}
                  {cuenta.divisa === 'USD'
                    ? `USD ${cuenta.monto.toFixed(4)} | Bs ${(cuenta.tasa ? (cuenta.monto * cuenta.tasa).toFixed(2) : '0.00')}`
                    : `Bs ${cuenta.monto.toFixed(2)} | USD ${(cuenta.tasa ? (cuenta.monto / cuenta.tasa).toFixed(4) : '0.0000')}`}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Divisa Original</label>
                <input type="text" className="w-full border rounded px-3 py-2 bg-slate-100" value={cuenta.divisa} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tasa Original</label>
                <input type="number" className="w-full border rounded px-3 py-2 bg-slate-100" value={cuenta.tasa} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tasa del Pago</label>
                <input type="number" className="w-full border rounded px-3 py-2" min={0} step="0.0001" value={cuentaEditada.tasaPago} onChange={handleChange('tasaPago')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moneda del Pago</label>
                <select className="w-full border rounded px-3 py-2" value={cuentaEditada.moneda} onChange={handleChange('moneda')}>
                  <option value="Bs">Bs</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descuento 1</label>
                <div className="flex gap-2 items-center">
                  <input type="number" className="w-full border rounded px-3 py-2" min={0} value={cuentaEditada.descuento1} onChange={handleChange('descuento1')} />
                  <select className="border rounded px-2 py-1 text-sm" value={cuentaEditada.tipoDescuento1} onChange={handleChange('tipoDescuento1')}>
                    <option value="porcentaje">%</option>
                    <option value="monto">{cuentaEditada.moneda}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descuento 2</label>
                <div className="flex gap-2 items-center">
                  <input type="number" className="w-full border rounded px-3 py-2" min={0} value={cuentaEditada.descuento2} onChange={handleChange('descuento2')} />
                  <select className="border rounded px-2 py-1 text-sm" value={cuentaEditada.tipoDescuento2} onChange={handleChange('tipoDescuento2')}>
                    <option value="porcentaje">%</option>
                    <option value="monto">{cuentaEditada.moneda}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Retención</label>
                <input type="number" className="w-full border rounded px-3 py-2" min={0} step="0.01" value={cuentaEditada.retencion ?? 0} onChange={handleChange('retencion')} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="esAbono" checked={!!cuentaEditada.esAbono} onChange={e => handleChange('esAbono')({
                  target: { type: 'checkbox', checked: e.target.checked, value: e.target.checked }
                } as any)} />
                <label htmlFor="esAbono" className="text-sm font-medium text-slate-700 mb-1">¿Monto a abonar?</label>
              </div>
              {cuentaEditada.esAbono && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto a Abonar</label>
                  <input
                    ref={montoInputRef}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    step="0.0001"
                    value={cuentaEditada.montoEditado === undefined || cuentaEditada.montoEditado === null ? '' : cuentaEditada.montoEditado}
                    onChange={handleChange('montoEditado')}
                  />
                  <div className="text-xs text-slate-500 mt-1">El abono no liquida la cuenta, solo descuenta del saldo.</div>
                </div>
              )}
              {!cuentaEditada.esAbono && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto a Pagar</label>
                  <input
                    ref={montoInputRef}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    step="0.0001"
                    value={cuentaEditada.montoEditado === undefined || cuentaEditada.montoEditado === null ? '' : cuentaEditada.montoEditado}
                    onChange={handleChange('montoEditado')}
                  />
                  <div className="text-xs text-slate-500 mt-1">Este monto ya descuenta la retención.</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observación</label>
                <textarea className="w-full border rounded px-3 py-2" rows={3} value={cuentaEditada.observacion} onChange={handleChange('observacion')} />
              </div>
            </div>
          </div>
          {/* Columna de Resumen */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Resumen de Cuenta</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">No. Factura:</span> <span className="font-mono">{cuenta.numeroFactura}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Proveedor:</span> <span className="font-mono">{cuenta.proveedor}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Divisa Original:</span> <span className="font-mono">{cuenta.divisa}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Monto Original:</span> <span className="font-mono">{(cuenta.montoOriginal ?? 0).toLocaleString(cuenta.divisa === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: cuenta.divisa === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Tasa Original:</span> <span className="font-mono">{(cuenta.tasa ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 4 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Moneda de Pago:</span> <span className="font-mono">{cuenta.moneda}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Tasa del Pago:</span> <span className="font-mono">{(cuenta.tasaPago ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 4 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Descuento 1:</span> <span className="font-mono">{(cuenta.descuento1 ?? 0)} {cuenta.tipoDescuento1 === 'porcentaje' ? '%' : cuenta.moneda}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Descuento 2:</span> <span className="font-mono">{(cuenta.descuento2 ?? 0)} {cuenta.tipoDescuento2 === 'porcentaje' ? '%' : cuenta.moneda}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Total Descuentos:</span> <span className="font-mono">{(cuenta.totalDescuentos ?? 0).toLocaleString(cuenta.moneda === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: cuenta.moneda === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Retención:</span> <span className="font-mono">{(cuenta.retencion ?? 0).toLocaleString(cuenta.moneda === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: cuenta.moneda === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Total a Acreditar:</span> <span className="font-mono">{(cuenta.totalAcreditar ?? 0).toLocaleString(cuenta.moneda === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: cuenta.moneda === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Nuevo Saldo:</span> <span className="font-mono">{(cuenta.nuevoSaldo ?? 0).toLocaleString(cuenta.moneda === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: cuenta.moneda === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Total Pagado Previo:</span> <span className="font-mono">{cuenta.moneda === 'USD' ? totalPagadoPrevioEnMoneda.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) : totalPagadoPrevioEnMoneda.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Saldo Restante:</span> <span className="font-mono">{
                cuenta.moneda === 'USD'
                  ? (cuenta.nuevoSaldo - totalPagadoPrevioEnMoneda).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
                  : (cuenta.nuevoSaldo - totalPagadoPrevioEnMoneda).toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })
              }</span></div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={handleGuardar} className="px-6 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700 transition-all">Guardar</button>
        </div>
      </div>
    </div>
  );
};

export default EdicionCuentaModal;
