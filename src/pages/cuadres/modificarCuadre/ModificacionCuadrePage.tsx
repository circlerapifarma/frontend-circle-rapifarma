import React, { useState } from 'react';
import ModificacionCuadre from './ModificacionCuadre';
import SeleccionCuadre from './SeleccionCuadre';
import { Calendar, X, Edit3, Settings2 } from 'lucide-react';

const ModificacionCuadrePage: React.FC = () => {
  const [fecha, setFecha] = useState('');
  const [cuadreSeleccionado, setCuadreSeleccionado] = useState<any | null>(null);

  const handleSelectCuadre = (cuadre: any) => {
    setCuadreSeleccionado(cuadre);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header de la página */}
        <header className="text-center mb-10">
          <div className="inline-flex p-3 bg-indigo-100 rounded-2xl text-indigo-600 mb-4">
            <Settings2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Modificar <span className="text-indigo-600">Cuadres</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Busca y edita registros históricos de caja</p>
        </header>

        {/* Selector de Fecha */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-wider">
              <Calendar className="w-5 h-5 text-indigo-500" /> Seleccionar Fecha:
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => {
                setFecha(e.target.value);
                setCuadreSeleccionado(null);
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 transition-all text-slate-700 font-bold bg-slate-50"
            />
          </div>
        </div>

        {/* Lista de selección */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SeleccionCuadre fecha={fecha} onSelect={handleSelectCuadre} />
        </div>

        {/* MODAL DE EDICIÓN (REEMPLAZANDO DIVS POR ESTRUCTURA MODERNA) */}
        {cuadreSeleccionado && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
              
              {/* Header del Modal */}
              <div className="bg-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Editar Cuadre</h2>
                </div>
                <button 
                  onClick={() => setCuadreSeleccionado(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-90"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              {/* Contenido del Formulario */}
              <div className="overflow-y-auto p-2 sm:p-4 bg-slate-50 flex-1">
                <ModificacionCuadre id={cuadreSeleccionado._id} onCancel={() => setCuadreSeleccionado(null)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModificacionCuadrePage;