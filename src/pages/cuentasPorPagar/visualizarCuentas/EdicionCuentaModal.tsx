import React from 'react';
import { FaTimes } from 'react-icons/fa';
import type { CuentaCompletaEdicion } from './type';
import { calcularMontosCuenta } from './type';

interface EdicionCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuenta: CuentaCompletaEdicion | undefined;
  onEdicionStateChange: (newState: CuentaCompletaEdicion) => void;
}

const EdicionCuentaModal: React.FC<EdicionCuentaModalProps> = ({
  isOpen,
  onClose,
  cuenta,
  onEdicionStateChange,
}) => {
  if (!isOpen || !cuenta) return null;

  // Handlers para campos editables
  const handleChange = (field: keyof CuentaCompletaEdicion) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let value: any = e.target.value;
    if (e.target.type === 'number') value = e.target.value === '' ? undefined : Number(value);
    if (e.target.type === 'checkbox') value = (e.target as HTMLInputElement).checked;
    const next = { ...cuenta, [field]: value };
    // Si el campo editado es 'montoEditado' y está tildado abono, NO recalcular montoEditado automáticamente
    if (field === 'montoEditado' && next.esAbono) {
      const calculos = calcularMontosCuenta({ ...next, tasa: next.tasaPago });
      onEdicionStateChange({ ...next, ...calculos, montoEditado: value });
    } else {
      const calculos = calcularMontosCuenta({ ...next, tasa: next.tasaPago });
      onEdicionStateChange({ ...next, ...calculos });
    }
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
                <input type="number" className="w-full border rounded px-3 py-2 bg-slate-100" value={cuenta.montoOriginal} disabled />
                <div className="text-xs text-slate-500 mt-1">
                  Ref: USD {cuenta.montoOriginalUsd.toFixed(4)} | Bs {cuenta.montoOriginalBs.toFixed(2)}
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
                <input type="number" className="w-full border rounded px-3 py-2" min={0} step="0.0001" value={cuenta.tasaPago} onChange={handleChange('tasaPago')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moneda del Pago</label>
                <select className="w-full border rounded px-3 py-2" value={cuenta.moneda} onChange={handleChange('moneda')}>
                  <option value="Bs">Bs</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descuento 1</label>
                <div className="flex gap-2 items-center">
                  <input type="number" className="w-full border rounded px-3 py-2" min={0} value={cuenta.descuento1} onChange={handleChange('descuento1')} />
                  <select className="border rounded px-2 py-1 text-sm" value={cuenta.tipoDescuento1} onChange={handleChange('tipoDescuento1')}>
                    <option value="porcentaje">%</option>
                    <option value="monto">{cuenta.moneda}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descuento 2</label>
                <div className="flex gap-2 items-center">
                  <input type="number" className="w-full border rounded px-3 py-2" min={0} value={cuenta.descuento2} onChange={handleChange('descuento2')} />
                  <select className="border rounded px-2 py-1 text-sm" value={cuenta.tipoDescuento2} onChange={handleChange('tipoDescuento2')}>
                    <option value="porcentaje">%</option>
                    <option value="monto">{cuenta.moneda}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Retención</label>
                <input type="number" className="w-full border rounded px-3 py-2" min={0} step="0.01" value={cuenta.retencion ?? 0} onChange={handleChange('retencion')} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="esAbono" checked={!!cuenta.esAbono} onChange={e => handleChange('esAbono')({
                  target: { type: 'checkbox', checked: e.target.checked, value: e.target.checked }
                } as any)} />
                <label htmlFor="esAbono" className="text-sm font-medium text-slate-700 mb-1">¿Monto a abonar?</label>
              </div>
              {cuenta.esAbono && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto a Abonar</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    step="0.0001"
                    value={cuenta.montoEditado === undefined || cuenta.montoEditado === null ? '' : cuenta.montoEditado}
                    onChange={handleChange('montoEditado')}
                  />
                  <div className="text-xs text-slate-500 mt-1">El abono no liquida la cuenta, solo descuenta del saldo.</div>
                </div>
              )}
              {!cuenta.esAbono && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto a Pagar</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    step="0.0001"
                    value={cuenta.montoEditado === undefined || cuenta.montoEditado === null ? '' : cuenta.montoEditado}
                    onChange={handleChange('montoEditado')}
                  />
                  <div className="text-xs text-slate-500 mt-1">Este monto ya descuenta la retención.</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observación</label>
                <textarea className="w-full border rounded px-3 py-2" rows={3} value={cuenta.observacion} onChange={handleChange('observacion')} />
              </div>
            </div>
          </div>
          {/* Columna de Resumen */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-700">Resumen de Cuenta</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">No. Factura:</span> <span className="font-mono">{cuenta.numeroFactura}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Monto Original Bs:</span> <span className="font-mono">{cuenta.montoOriginalBs.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Monto Original USD:</span> <span className="font-mono">{cuenta.montoOriginalUsd.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Nuevo Monto Bs a Pagar:</span> <span className="font-mono">{cuenta.nuevoMontoEnBsAPagar.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Descuento 1:</span> <span className="font-mono">{cuenta.d1.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Descuento 2:</span> <span className="font-mono">{cuenta.d2.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Total Descuentos:</span> <span className="font-mono">{cuenta.totalDescuentos.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Total a Acreditar:</span> <span className="font-mono">{cuenta.totalAcreditar.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Nuevo Saldo:</span> <span className="font-mono">{cuenta.nuevoSaldo.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdicionCuentaModal;
