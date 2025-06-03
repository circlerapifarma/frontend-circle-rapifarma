import React, { useEffect, useState } from "react";

interface CuentaPorPagar {
  _id: string;
  fechaEmision: string;
  diasCredito: number;
  numeroFactura: string;
  numeroControl: string;
  proveedor: string;
  descripcion: string;
  monto: number;
  divisa: "USD" | "Bs";
  tasa: number;
  estatus: string;
  usuarioCorreo: string;
  farmacia: string;
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ESTATUS_OPCIONES = ["activa", "inactiva", "pagada", "anulada"];

function calcularDiasRestantes(fechaEmision: string, diasCredito: number) {
  const fechaEmi = new Date(fechaEmision);
  const fechaVenc = new Date(fechaEmi);
  fechaVenc.setDate(fechaVenc.getDate() + diasCredito);
  const hoy = new Date();
  const diff = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// Helper para formatear el estatus como "badge"
const EstatusBadge: React.FC<{ estatus: string }> = ({ estatus }) => {
  let colorClasses = "";
  switch (estatus.toLowerCase()) {
    case "activa":
      colorClasses = "bg-green-100 text-green-800";
      break;
    case "pagada":
      colorClasses = "bg-blue-100 text-blue-800";
      break;
    case "anulada":
      colorClasses = "bg-red-100 text-red-800";
      break;
    case "inactiva":
      colorClasses = "bg-yellow-100 text-yellow-800";
      break;
    default:
      colorClasses = "bg-slate-100 text-slate-800";
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
      {estatus.charAt(0).toUpperCase() + estatus.slice(1)}
    </span>
  );
};


const VisualizarCuentasPorPagarPage: React.FC = () => {
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string | null; nuevoEstatus: string }>({ open: false, id: null, nuevoEstatus: "" });
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");
  const [proveedorFiltro, setProveedorFiltro] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [estatusFiltro, setEstatusFiltro] = useState<string>("activa");
  const [descripcionExpandida, setDescripcionExpandida] = useState<string | null>(null);

  const fetchCuentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const res = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al obtener cuentas por pagar");
      const data = await res.json();
      setCuentas(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener cuentas por pagar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, []);

  useEffect(() => {
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(farmaciasArr);
        if (farmaciasArr.length === 1) setSelectedFarmacia(farmaciasArr[0].id);
      } catch {
        setFarmacias([]);
      }
    }
  }, []);

  const handleEstadoChange = (id: string, nuevoEstatus: string) => {
    setConfirmDialog({ open: true, id, nuevoEstatus });
  };

  const handleConfirmChange = async () => {
    if (!confirmDialog.id) return;
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const res = await fetch(`${API_BASE_URL}/cuentas-por-pagar/${confirmDialog.id}/estatus`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ estatus: confirmDialog.nuevoEstatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al actualizar estatus");
      }
      setSuccess("Estatus actualizado correctamente");
      setCuentas(prev => prev.map(c => c._id === confirmDialog.id ? { ...c, estatus: confirmDialog.nuevoEstatus } : c));
    } catch (err: any) {
      setError(err.message || "Error al actualizar estatus");
    } finally {
      setConfirmDialog({ open: false, id: null, nuevoEstatus: "" });
    }
  };

  const handleCancelChange = () => {
    setConfirmDialog({ open: false, id: null, nuevoEstatus: "" });
  };

  const cuentasFiltradas = cuentas
    .filter(c => !selectedFarmacia || c.farmacia === selectedFarmacia)
    .filter(c => !proveedorFiltro || c.proveedor.toLowerCase().includes(proveedorFiltro.toLowerCase()))
    .filter(c => !estatusFiltro || c.estatus === estatusFiltro)
    .filter(c => {
      if (!fechaInicio && !fechaFin) return true;
      const fecha = c.fechaEmision.slice(0, 10);
      if (fechaInicio && fecha < fechaInicio) return false;
      if (fechaFin && fecha > fechaFin) return false;
      return true;
    })
    .sort((a, b) => {
      const diasA = calcularDiasRestantes(a.fechaEmision, a.diasCredito);
      const diasB = calcularDiasRestantes(b.fechaEmision, b.diasCredito);
      return diasA - diasB;
    });

  return (
    // Contenedor principal con un fondo sutil para la página
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-8 text-center">Cuentas por Pagar</h1>
        
        {/* Mensajes de error/éxito con mejor estilo */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Éxito</p>
            <p>{success}</p>
          </div>
        )}

        {/* Sección de Filtros con un card y mejor layout */}
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
              <label htmlFor="proveedorFiltro" className="block text-sm font-medium text-slate-600 mb-1">Proveedor</label>
              <input 
                type="text" 
                id="proveedorFiltro"
                value={proveedorFiltro} 
                onChange={e => setProveedorFiltro(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm" 
                placeholder="Buscar proveedor..." />
            </div>
            <div>
              <label htmlFor="estatusFiltro" className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
              <select 
                id="estatusFiltro"
                value={estatusFiltro} 
                onChange={e => setEstatusFiltro(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
              >
                <option value="">Todos</option>
                {ESTATUS_OPCIONES.map(opt => (
                  <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                ))}
              </select>
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
            Cargando cuentas...
          </div>
        ) : cuentasFiltradas.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay cuentas por pagar</h3>
            <p className="mt-1 text-sm text-slate-500">No se encontraron cuentas que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    {/* Cabeceras de tabla con más padding y estilo uniforme */}
                    {['Fecha', 'Factura', 'Control', 'Proveedor', 'Descripción', 'Monto', 'Divisa', 'Tasa', 'Usuario', 'Farmacia', 'Estatus', 'Días Vencer', 'Acción'].map(header => (
                      <th key={header} scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {cuentasFiltradas.map(c => {
                    const diasRestantes = calcularDiasRestantes(c.fechaEmision, c.diasCredito);
                    let diasVencerClasses = "text-slate-700";
                    if (diasRestantes <= 0) {
                      diasVencerClasses = "text-red-600 font-bold";
                    } else if (diasRestantes <= 3) {
                      diasVencerClasses = "text-orange-600 font-semibold";
                    } else if (diasRestantes <= 7) {
                      diasVencerClasses = "text-yellow-600";
                    }

                    return (
                      <tr key={c._id} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.fechaEmision?.slice(0,10)}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.numeroFactura}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.numeroControl}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{c.proveedor}</td>
                        <td className="px-5 py-4 text-sm text-slate-700 max-w-sm"> {/* Permitir que la descripción se expanda un poco más */}
                          {descripcionExpandida === c._id ? (
                            <>
                              <span className="whitespace-normal">{c.descripcion}</span>
                              <button className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium" onClick={() => setDescripcionExpandida(null)}>Ocultar</button>
                            </>
                          ) : (
                            <>
                              <span>{c.descripcion.length > 40 ? c.descripcion.slice(0, 40) + '...' : c.descripcion}</span>
                              {c.descripcion.length > 40 && (
                                <button className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium" onClick={() => setDescripcionExpandida(c._id)}>Ver más</button>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.divisa}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.tasa > 0 ? c.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{c.usuarioCorreo}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.farmacia}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <EstatusBadge estatus={c.estatus} />
                        </td>
                        <td className={`px-5 py-4 whitespace-nowrap text-sm ${diasVencerClasses}`}>
                          {diasRestantes <= 0 ? `Vencido (${diasRestantes} días)` : `${diasRestantes} días`}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <select
                            value={c.estatus}
                            onChange={e => handleEstadoChange(c._id, e.target.value)}
                            className="border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1.5 px-2 text-xs" // Ligeramente más pequeño para la tabla
                          >
                            {ESTATUS_OPCIONES.map(opt => (
                              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Diálogo de confirmación con mejor estilo */}
        {confirmDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Confirmar Cambio de Estatus</h2>
              <p className="text-slate-600 mb-6">
                ¿Está seguro que desea cambiar el estatus de la factura a <span className="font-bold text-indigo-600">{confirmDialog.nuevoEstatus}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={handleCancelChange} 
                  className="px-5 py-2.5 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium transition-colors duration-150 ease-in-out"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmChange} 
                  className="px-5 py-2.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizarCuentasPorPagarPage;