import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx'; // Asegúrate de tener instalada la librería: npm install xlsx
import TablaPagos from './TablaPagos';
import type { Pago } from './pagosTypes';
import { fetchPagosPorRangoFechas } from './usePagosPCC';

const FARMACIAS_MOCK = [
  { id: '01', nombre: 'Santa Elena' }, { id: '02', nombre: 'Sur America' },
  { id: '03', nombre: 'Rapifarma' }, { id: '04', nombre: 'San Carlos' },
  { id: '05', nombre: 'Las Alicias' }, { id: '06', nombre: 'San Martin' },
  { id: '07', nombre: 'Milagro Norte' }, { id: '08', nombre: 'Virginia' },
  { id: '09', nombre: 'Santo tomas' }, { id: '10', nombre: 'Santa Rosa' },
  { id: '11', nombre: 'Santa Monica' },
];

const VisualizarPagos: React.FC = () => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [farmaciasSeleccionadas, setFarmaciasSeleccionadas] = useState<string[]>([]);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [proveedor, setProveedor] = useState(''); // Nuevo filtro
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const pagosRes = await fetchPagosPorRangoFechas(fechaInicio, fechaFin);
      setPagos(pagosRes);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'Error al buscar pagos.');
    } finally {
      setLoading(false);
    }
  };

  const pagosFiltrados = useMemo(() => {
    return pagos.filter(pago => {
      const cumpleFarmacia = farmaciasSeleccionadas.length === 0 || farmaciasSeleccionadas.includes(pago.farmaciaId);
      const cumpleFactura = numeroFactura.trim() === '' || pago.numeroFactura.toLowerCase().includes(numeroFactura.trim().toLowerCase());
      const cumpleProveedor = proveedor.trim() === '' || pago.proveedor.toLowerCase().includes(proveedor.trim().toLowerCase());
      return cumpleFarmacia && cumpleFactura && cumpleProveedor;
    });
  }, [pagos, farmaciasSeleccionadas, numeroFactura, proveedor]);

  const handleExportarExcel = () => {
    if (pagosFiltrados.length === 0) return;
    
    // Crear hoja de trabajo a partir de los datos filtrados
    const worksheet = XLSX.utils.json_to_sheet(pagosFiltrados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pagos");
    
    // Generar archivo y descargar
    XLSX.writeFile(workbook, `Reporte_Pagos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-slate-50 font-sans p-4 sm:p-6 md:p-8 min-h-screen text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Visualizar Pagos</h1>
            <p className="text-slate-600">Gestiona y exporta los registros de pagos.</p>
          </div>
          {pagosFiltrados.length > 0 && (
            <button 
              onClick={handleExportarExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>📊</span> Exportar a Excel
            </button>
          )}
        </header>

        {/* Formulario de búsqueda (Rango de fechas) */}
        <form onSubmit={handleBuscar} className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Fecha inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required 
                   className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Fecha fin</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required 
                   className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
          </div>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white font-bold py-2 px-8 rounded hover:bg-blue-700 disabled:bg-slate-400 h-[42px] transition-colors">
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </form>

        {/* Filtros de Refinamiento */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700">Proveedor</label>
              <input type="text" placeholder="Nombre del proveedor..." value={proveedor} onChange={e => setProveedor(e.target.value)}
                     className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700">Nro. Factura</label>
              <input type="text" placeholder="Ej: 100234..." value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)}
                     className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            <div className="lg:col-span-2">
              <label className="block mb-2 text-sm font-bold text-slate-700">Farmacias</label>
              <div className="flex flex-wrap gap-2">
                {FARMACIAS_MOCK.map(f => (
                  <button key={f.id} onClick={() => setFarmaciasSeleccionadas(prev => prev.includes(f.id) ? prev.filter(i => i !== f.id) : [...prev, f.id])}
                          className={`py-1 px-3 rounded-full text-xs font-medium border transition-all ${farmaciasSeleccionadas.includes(f.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    {f.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla y Mensajes */}
        <div className="space-y-4">
          {loading && <div className="text-center py-10 text-blue-600 animate-pulse">Cargando registros...</div>}
          {error && <div className="p-4 bg-red-50 text-red-700 border-l-4 border-red-500 rounded">{error}</div>}
          
          {!loading && hasSearched && pagosFiltrados.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <TablaPagos pagos={pagosFiltrados} />
            </div>
          ) : hasSearched && !loading && (
            <div className="text-center py-10 bg-slate-100 rounded-lg text-slate-500 border border-dashed border-slate-300">
              No se encontraron resultados con los filtros aplicados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizarPagos;