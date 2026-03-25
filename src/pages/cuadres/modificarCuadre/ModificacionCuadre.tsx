import React, { useState, useEffect } from 'react';
import { useModificarCuadre, useDetalleCuadres } from './useModificacionCuadre';
import type { Cuadre } from './useModificacionCuadre';
import { Save, Ban, Info, CreditCard, } from 'lucide-react';

  
interface Props {
  id: string;
  onCancel?: () => void;
}

const ModificacionCuadre: React.FC<Props> = ({ id, onCancel }) => {
  const [editData, setEditData] = useState<Cuadre | null>(null);
  const { result, loading: loadingMod, error: errorMod, modificarCuadre } = useModificarCuadre();
  const { data: detalleData, loading: loadingCuadre, fetchDetalle } = useDetalleCuadres();

  useEffect(() => {
    if (id) fetchDetalle({ id });
  }, [id]);

  useEffect(() => {
    if (detalleData && Array.isArray(detalleData) && detalleData.length > 0) {
      setEditData({ ...detalleData[0] });
    }
  }, [detalleData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editData) return;
    const { name, value, type } = e.target;
    setEditData({
      ...editData,
      [name]: type === 'number' ? Number(value) : value
    });
  };

  // Clases de Tailwind para inputs
  const editableClass = "w-full px-4 py-2.5 rounded-xl border-2 border-indigo-100 bg-indigo-50/30 text-slate-900 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none text-sm";
  const readonlyClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium text-sm cursor-not-allowed";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block";

  if (loadingCuadre) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Cargando datos...</p>
    </div>
  );

  if (!editData) return null;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <form onSubmit={e => { e.preventDefault(); if (id && editData) modificarCuadre(id, editData); }}>
        
        {/* Sección: Datos Generales */}
        <div className="mb-8">
          <h3 className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-tighter mb-4 pb-2 border-b border-indigo-50">
            <Info className="w-4 h-4" /> Información Editable
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Día / Fecha Manual</label>
              <input name="dia" value={editData.dia} onChange={handleChange} className={editableClass} />
            </div>
            <div>
              <label className={labelClass}>Turno de Trabajo</label>
              <select name="turno" value={editData.turno} onChange={handleChange} className={editableClass}>
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="De Turno">De Turno</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Costo Inventario</label>
              <input name="costoInventario" type="number" value={editData.costoInventario} onChange={handleChange} className={editableClass} />
            </div>
            <div>
              <label className={labelClass}>Estado del Cuadre</label>
              <select name="estado" value={editData.estado ?? ''} onChange={handleChange} className={editableClass}>
                <option value="wait">Pendiente (wait)</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sección: Datos de Solo Lectura */}
        <div className="mb-8">
          <h3 className="flex items-center gap-2 text-slate-400 font-black uppercase text-xs tracking-tighter mb-4 pb-2 border-b border-slate-100">
            <Ban className="w-4 h-4" /> Datos Protegidos (Solo Lectura)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Cajero', value: editData.cajero },
              { label: 'Caja #', value: editData.cajaNumero },
              { label: 'Tasa', value: editData.tasa },
              { label: 'Efectivo Bs', value: editData.efectivoBs },
              { label: 'Efectivo USD', value: editData.efectivoUsd },
              { label: 'Zelle USD', value: editData.zelleUsd },
              { label: 'Total Sistema', value: editData.totalCajaSistemaBs },
              { label: 'Total General USD', value: editData.totalGeneralUsd },
              { label: 'Diferencia', value: editData.diferenciaUsd },
            ].map((item, idx) => (
              <div key={idx}>
                <label className={labelClass}>{item.label}</label>
                <input value={item.value} readOnly className={readonlyClass} />
              </div>
            ))}
          </div>
        </div>

        {/* Sección: Puntos de Venta */}
        <div className="mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <h3 className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-tighter mb-4">
            <CreditCard className="w-4 h-4" /> Puntos de Venta (Crédito Editable)
          </h3>
          <div className="space-y-3">
            {editData.puntosVenta?.map((pv, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 items-center">
                <div className="text-[11px] font-bold text-slate-700 truncate">{pv.banco}</div>
                <div className="text-[10px] text-slate-400 font-medium">Deb: {pv.puntoDebito}</div>
                <input
                  type="number"
                  value={pv.puntoCredito}
                  onChange={(e) => {
                    const newPuntos = [...(editData.puntosVenta || [])];
                    newPuntos[idx].puntoCredito = Number(e.target.value);
                    setEditData({...editData, puntosVenta: newPuntos});
                  }}
                  className="px-2 py-1 rounded-lg border-2 border-indigo-50 bg-indigo-50/20 text-indigo-700 font-black text-xs outline-none focus:border-indigo-400"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loadingMod}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" /> {loadingMod ? 'Guardando...' : 'GUARDAR CAMBIOS'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white border-2 border-slate-200 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all"
          >
            CANCELAR
          </button>
        </div>

        {/* Mensajes de Estado */}
        {errorMod && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">{errorMod}</div>}
        {result && <div className="mt-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold text-center border border-emerald-100">{result.message}</div>}
      </form>
    </div>
  );
};

export default ModificacionCuadre;
