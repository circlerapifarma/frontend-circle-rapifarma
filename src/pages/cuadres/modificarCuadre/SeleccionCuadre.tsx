import React from 'react';
import { useResumenCuadres } from './useModificacionCuadre';
import { 
  Store, 
  User, 
  Clock, 
  ChevronRight, 
  Search, 
  AlertCircle,
  Timer
} from 'lucide-react';

interface SeleccionCuadreProps {
  onSelect: (cuadre: any) => void;
  fecha: string;
}

const SeleccionCuadre: React.FC<SeleccionCuadreProps> = ({ onSelect, fecha }) => {
  const { data, loading, error, fetchResumen } = useResumenCuadres();

  React.useEffect(() => {
    if (fecha) fetchResumen(fecha);
  }, [fecha]);

  // Función para renderizar el badge de estado con colores
  const renderStatusBadge = (estado: string) => {
    const config: Record<string, string> = {
      wait: "bg-amber-100 text-amber-700 border-amber-200",
      aprobado: "bg-emerald-100 text-emerald-700 border-emerald-200",
      rechazado: "bg-red-100 text-red-700 border-red-200",
    };
    const style = config[estado] || "bg-slate-100 text-slate-600 border-slate-200";
    
    return (
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${style}`}>
        {estado || 'N/A'}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
      {/* Header del Listado */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-500" /> Resultados del día
        </h3>
        {data?.cuadres && (
          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg">
            {data.cuadres.length} Registros
          </span>
        )}
      </div>

      <div className="p-4 sm:p-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold animate-in shake-1">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Buscando cuadres...</p>
          </div>
        )}

        {data && data.cuadres && data.cuadres.length > 0 ? (
          <ul className="space-y-3">
            {data.cuadres.map((c: any) => (
              <li key={c._id} className="group">
                <button
                  onClick={() => onSelect(c)}
                  className="w-full text-left bg-white border-2 border-slate-50 rounded-2xl p-4 transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 active:scale-[0.98] flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    {/* Nombre Farmacia */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        <Store className="w-4 h-4" />
                      </div>
                      <span className="font-black text-slate-800 uppercase text-sm truncate">
                        {c.nombreFarmacia ?? 'Farmacia sin nombre'}
                      </span>
                    </div>

                    {/* Meta Info Grid */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Cajero: <span className="text-slate-700">{c.cajero}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Turno: <span className="text-slate-700">{c.turno}</span></span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 sm:mt-0">
                        {renderStatusBadge(c.estado)}
                      </div>
                    </div>
                  </div>

                  {/* Icono de flecha */}
                  <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Timer className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                No hay cuadres registrados
              </p>
              <p className="text-slate-300 text-xs mt-1 font-medium">
                Selecciona otra fecha para ver los resultados
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SeleccionCuadre;