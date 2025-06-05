import React, { useEffect, useState } from "react";

interface Inventario {
  _id: string;
  fecha: string;
  farmacia: string;
  costo: number;
  usuarioCorreo: string;
  estado: string; // Nuevo campo
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ESTADO_OPCIONES = ["activo", "inactivo"];

const VisualizarInventariosPage: React.FC = () => {
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");
  const [usuarioFiltro, setUsuarioFiltro] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<{ id: string; nuevoEstado: string } | null>(null);

  const fetchInventarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const res = await fetch(`${API_BASE_URL}/inventarios`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al obtener inventarios");
      const data = await res.json();
      setInventarios(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener inventarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventarios();
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/farmacias`)
      .then(res => res.json())
      .then(data => {
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
        if (lista.length === 1) setSelectedFarmacia(lista[0].id);
      });
  }, []);

  const handleEstadoChange = async (id: string, nuevoEstado: string) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const res = await fetch(`${API_BASE_URL}/inventarios/${id}/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al actualizar estado");
      }
      setInventarios(prev => prev.map(i => i._id === id ? { ...i, estado: nuevoEstado } : i));
    } catch (err: any) {
      setError(err.message || "Error al actualizar estado");
    }
  };

  const handleEstadoSelect = (id: string, nuevoEstado: string) => {
    setPendingEstado({ id, nuevoEstado });
    setShowConfirmModal(true);
  };

  const handleConfirmEstadoChange = async () => {
    if (pendingEstado) {
      await handleEstadoChange(pendingEstado.id, pendingEstado.nuevoEstado);
      setShowConfirmModal(false);
      setPendingEstado(null);
    }
  };

  const handleCancelEstadoChange = () => {
    setShowConfirmModal(false);
    setPendingEstado(null);
  };

  const inventariosFiltrados = inventarios
    .filter(i => !selectedFarmacia || i.farmacia === selectedFarmacia)
    .filter(i => !usuarioFiltro || i.usuarioCorreo.toLowerCase().includes(usuarioFiltro.toLowerCase()))
    .filter(i => {
      if (!fechaInicio && !fechaFin) return true;
      const fecha = i.fecha?.slice(0, 10);
      if (fechaInicio && fecha < fechaInicio) return false;
      if (fechaFin && fecha > fechaFin) return false;
      return true;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-8 text-center">Inventarios Registrados</h1>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Filtros</h2>
          {farmacias.length > 1 && (
            <div className="mb-6">
              <span className="font-medium text-slate-700 mr-3">Farmacias:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {farmacias.map(f => (
                  <button
                    key={f.id}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-in-out
                                ${selectedFarmacia === f.id 
                                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-300'}`}
                    onClick={() => setSelectedFarmacia(f.id === selectedFarmacia ? "" : f.id)}
                  >
                    {f.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label htmlFor="usuarioFiltro" className="block text-sm font-medium text-slate-600 mb-1">Usuario</label>
              <input 
                type="text" 
                id="usuarioFiltro"
                value={usuarioFiltro} 
                onChange={e => setUsuarioFiltro(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm" 
                placeholder="Buscar por correo..." />
            </div>
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-slate-600 mb-1">Fecha desde</label>
              <input 
                type="date" 
                id="fechaInicio"
                value={fechaInicio} 
                onChange={e => setFechaInicio(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm" />
            </div>
            <div>
              <label htmlFor="fechaFin" className="block text-sm font-medium text-slate-600 mb-1">Fecha hasta</label>
              <input 
                type="date" 
                id="fechaFin"
                value={fechaFin} 
                onChange={e => setFechaFin(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm" />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando inventarios...
          </div>
        ) : inventariosFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay inventarios registrados</h3>
            <p className="mt-1 text-sm text-slate-500">No se encontraron inventarios que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    {['Fecha', 'Farmacia', 'Costo', 'Usuario', 'Estado'].map(header => (
                      <th key={header} scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {inventariosFiltrados.map(i => (
                    <tr key={i._id} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{i.fecha?.slice(0,10)}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{i.farmacia}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{i.costo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{i.usuarioCorreo}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        <select
                          value={i.estado}
                          onChange={e => handleEstadoSelect(i._id, e.target.value)}
                          className="border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1.5 px-2 text-xs"
                        >
                          {ESTADO_OPCIONES.map(opt => (
                            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Modal de confirmación */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-3 text-slate-800">Confirmar cambio de estado</h3>
              <p className="mb-5 text-slate-600 text-sm">
                ¿Está seguro que desea cambiar el estado del inventario a
                <span className="font-bold text-indigo-700">
                  {pendingEstado && pendingEstado.nuevoEstado
                    ? pendingEstado.nuevoEstado.charAt(0).toUpperCase() + pendingEstado.nuevoEstado.slice(1)
                    : ""}
                </span>
                ? Esta acción no se puede deshacer fácilmente.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelEstadoChange}
                  className="px-4 py-2 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmEstadoChange}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizarInventariosPage;
