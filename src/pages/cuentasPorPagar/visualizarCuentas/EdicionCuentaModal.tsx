import React from 'react';
import { FaTimes } from 'react-icons/fa';
import type { CuentaPorPagar } from './VisualizarCuentasPorPagarPage';

export interface EdicionCuenta {
  montoOriginal: number;
  montoEditado: number;
  descuento1: number;
  tipoDescuento1: 'monto' | 'porcentaje';
  descuento2: number;
  tipoDescuento2: 'monto' | 'porcentaje';
  observacion: string;
  tasa: number; // Nueva propiedad para la tasa del pago
  moneda: 'USD' | 'Bs'; // Nueva propiedad para la moneda del pago
  esAbono?: boolean;
  // retencion?: number; // Eliminada, ahora se toma de cuenta
}

// Calcula y retorna los valores finales de la cuenta editada
export const calcularMontosCuenta = (edicion: EdicionCuenta) => {
  const base = typeof edicion.montoEditado === 'number' ? edicion.montoEditado : 0;
  const tipoDescuento1 = edicion.tipoDescuento1 || 'monto';
  const tipoDescuento2 = edicion.tipoDescuento2 || 'monto';
  const descuento1 = typeof edicion.descuento1 === 'number' ? edicion.descuento1 : 0;
  const descuento2 = typeof edicion.descuento2 === 'number' ? edicion.descuento2 : 0;
  const d1 = tipoDescuento1 === 'porcentaje' ? (base * descuento1 / 100) : descuento1;
  const afterD1 = base - d1;
  const d2 = tipoDescuento2 === 'porcentaje' ? (afterD1 * descuento2 / 100) : descuento2;
  const totalDescuentos = d1 + d2;
  const totalAcreditar = base - totalDescuentos;
  const nuevoSaldo = (typeof edicion.montoOriginal === 'number' ? edicion.montoOriginal : 0) - totalAcreditar;
  return {
    d1,
    d2,
    totalDescuentos,
    totalAcreditar,
    nuevoSaldo
  };
};

interface EdicionCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuenta: CuentaPorPagar | undefined;
  edicionState: EdicionCuenta | undefined;
  onEdicionStateChange: (newState: Partial<EdicionCuenta>) => void;
}

const EdicionCuentaModal: React.FC<EdicionCuentaModalProps> = ({
  isOpen,
  onClose,
  cuenta,
  edicionState,
  onEdicionStateChange,
}) => {
  if (!isOpen || !cuenta || !edicionState) {
    return null;
  }

  // Selecciona Bs como moneda predeterminada si no está definida
  React.useEffect(() => {
    if (isOpen && edicionState && !edicionState.moneda) {
      onEdicionStateChange({ moneda: 'Bs' });
    }
  }, [isOpen, edicionState, onEdicionStateChange]);

  React.useEffect(() => {
    if (isOpen && cuenta && edicionState) {
      // Si la cuenta tiene retención y el montoEditado aún no ha sido editado manualmente, inicialízalo
      if (
        typeof cuenta.retencion === 'number' &&
        (edicionState.montoEditado === undefined || edicionState.montoEditado === null)
      ) {
        onEdicionStateChange({ montoEditado: Number(cuenta.montoOriginal) - Number(cuenta.retencion) });
      }
    }
  }, [isOpen, cuenta, edicionState, onEdicionStateChange]);

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const montoEditado = Number(e.target.value);
    onEdicionStateChange({
      montoEditado,
    });
  };

  const handleDescuento1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onEdicionStateChange({ descuento1: value });
  };
  const handleTipoDescuento1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value as 'monto' | 'porcentaje';
    onEdicionStateChange({ tipoDescuento1: tipo });
  };
  const handleDescuento2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onEdicionStateChange({ descuento2: value });
  };
  const handleTipoDescuento2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value as 'monto' | 'porcentaje';
    onEdicionStateChange({ tipoDescuento2: tipo });
  };

  const handleObservacionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onEdicionStateChange({ observacion: e.target.value });
  };

  const handleTasaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tasa = Number(e.target.value);
    onEdicionStateChange({ tasa });
  };

  // Cambia el monto automáticamente al cambiar la moneda
  const handleMonedaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaMoneda = e.target.value as 'USD' | 'Bs';
    onEdicionStateChange({ moneda: nuevaMoneda });
  };

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna de Inputs */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Detalles del Pago</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto Original</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 bg-slate-100"
                  value={edicionState.montoOriginal}
                  disabled
                />
                {/* Referencia SIEMPRE en USD, calculada solo con montoOriginal y tasa de la cuenta */}
                {cuenta.tasa && cuenta.tasa > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    Ref: USD {(Number(edicionState.montoOriginal) / Number(cuenta.tasa)).toFixed(4)} @ tasa {Number(cuenta.tasa).toFixed(2)}
                  </div>
                )}
                {/* Ref en Bs SIEMPRE que haya tasa original de la cuenta */}
                {cuenta.tasa && cuenta.tasa > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    Ref: Bs {(Number(edicionState.montoOriginal)).toFixed(2)} = USD {(Number(edicionState.montoOriginal) / Number(cuenta.tasa)).toFixed(4)} @ tasa {Number(cuenta.tasa).toFixed(2)} (tasa inicial)
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moneda a realizar el pago</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={edicionState.moneda}
                  onChange={handleMonedaChange}
                >
                  <option value="Bs">Bs</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none pl-1">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={!!edicionState.esAbono}
                    onChange={e => onEdicionStateChange({ esAbono: e.target.checked })}
                  />
                  <span className="text-sm text-slate-700">Abono</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tasa Original (no editable)</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 bg-slate-100"
                  value={cuenta.tasa !== undefined && cuenta.tasa !== null ? cuenta.tasa : ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tasa del Pago</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  min={0}
                  step="0.0001"
                  value={edicionState.tasa !== undefined && edicionState.tasa !== null ? edicionState.tasa : ''}
                  onChange={handleTasaChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descuento 1</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    value={edicionState.descuento1}
                    onChange={handleDescuento1Change}
                  />
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={edicionState.tipoDescuento1}
                    onChange={handleTipoDescuento1Change}
                  >
                    <option value="porcentaje">%</option>
                    <option value="monto">{edicionState.moneda}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descuento 2</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    value={edicionState.descuento2}
                    onChange={handleDescuento2Change}
                  />
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={edicionState.tipoDescuento2}
                    onChange={handleTipoDescuento2Change}
                  >
                    <option value="porcentaje">%</option>
                    <option value="monto">{edicionState.moneda}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto a Pagar</label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  min={0}
                  step="0.0001"
                  value={edicionState.montoEditado ?? ''}
                  onChange={handleMontoChange}
                  placeholder={`Monto en ${edicionState.moneda}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observación</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={edicionState.observacion}
                  onChange={handleObservacionChange}
                />
              </div>
            </div>
          </div>

          {/* Columna de Resumen */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Resumen de Cuenta</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">No. Factura:</span> <span className="font-mono">{cuenta.numeroFactura}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Monto Original:</span> <span className="font-mono">Bs {(edicionState.montoOriginal ?? 0).toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Saldo Actual:</span> <span className="font-mono">Bs {(edicionState.montoOriginal ?? 0).toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Tasa del Pago:</span> <span className="font-mono">{edicionState.tasa ? edicionState.tasa.toFixed(4) : '-'}</span></div>
              {edicionState.moneda === 'USD' && !edicionState.tasa && (
                <div className="text-xs text-red-600 font-semibold">¡Debe ingresar la tasa para pagos en USD!</div>
              )}
              <hr className="my-2"/>
              <div className="flex justify-between text-blue-600"><span className="font-semibold">Monto a Pagar:</span> <span className="font-mono font-bold">{edicionState.moneda} {(edicionState.montoEditado ?? 0).toFixed(4)}</span></div>
              {/* Cálculo de descuentos secuenciales en la moneda seleccionada */}
              {(() => {
                let base = edicionState.montoEditado ?? 0;
                let d1 = edicionState.tipoDescuento1 === 'monto' ? (edicionState.descuento1 ?? 0) : (base * (edicionState.descuento1 ?? 0) / 100);
                let afterD1 = base - d1;
                let d2 = edicionState.tipoDescuento2 === 'monto' ? (edicionState.descuento2 ?? 0) : (afterD1 * (edicionState.descuento2 ?? 0) / 100);
                let totalDescuentos = d1 + d2;
                let retencion = cuenta.retencion ?? 0;
                let totalAcreditar = base - totalDescuentos - retencion; // Ahora sí se resta la retención
                let montoOriginalMoneda = edicionState.montoOriginal;
                if (edicionState.moneda === 'USD' && edicionState.tasa) montoOriginalMoneda = montoOriginalMoneda / edicionState.tasa;
                let nuevoSaldo = montoOriginalMoneda - totalAcreditar;
                return (
                  <>
                    <div className="flex justify-between"><span className="text-slate-600">Descuento 1:</span> <span className="font-mono">{edicionState.tipoDescuento1 === 'porcentaje' ? `${edicionState.descuento1?.toFixed(4)}%` : `${edicionState.moneda} ${(edicionState.descuento1 ?? 0).toFixed(4)}`}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Descuento 2:</span> <span className="font-mono">{edicionState.tipoDescuento2 === 'porcentaje' ? `${edicionState.descuento2?.toFixed(4)}%` : `${edicionState.moneda} ${(edicionState.descuento2 ?? 0).toFixed(4)}`}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Total Descuentos:</span> <span className="font-mono">{edicionState.moneda} {totalDescuentos.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Retención:</span> <span className="font-mono">{edicionState.moneda} {retencion.toFixed(4)}</span></div>
                    <div className="flex justify-between text-green-700 font-semibold"><span>Total a Acreditar:</span> <span className="font-mono">{edicionState.moneda} {totalAcreditar.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Nuevo Saldo:</span> <span className="font-mono">{edicionState.moneda} {nuevoSaldo.toFixed(4)}</span></div>
                    <hr className="my-2"/>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdicionCuentaModal;
