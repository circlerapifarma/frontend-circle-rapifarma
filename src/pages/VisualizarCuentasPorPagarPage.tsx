import React, { useEffect, useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ModalCuentasPorPagar from "@/components/ModalCuentasPorPagar";
import AbonoModal from '../components/AbonoModal';
import { animate, stagger } from 'animejs';
import PagosDropdown from "../components/PagosDropdown";
import PagoMasivoModal from "../components/PagoMasivoModal";

export type { CuentaPorPagar };

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
  retencion: number;
  fechaRecepcion: string;
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ESTATUS_OPCIONES = ["wait", "activa", "inactiva", "pagada", "anulada"];

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

const formatFecha = (fechaISO: string) => {
  if (!fechaISO) return "-";
  const date = new Date(fechaISO);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
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
  const [estatusFiltro, setEstatusFiltro] = useState<string>("wait");
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaPorPagar | null>(null);
  const [abonoModalOpen, setAbonoModalOpen] = useState<string | null>(null); // id de la cuenta
  const [abonoCuenta, setAbonoCuenta] = useState<any>(null);
  const [pagosPorCuenta, setPagosPorCuenta] = useState<{ [key: string]: { loading: boolean, error?: string, pagos?: any[] } }>({});
  const [selectedFacturas, setSelectedFacturas] = useState<string[]>([]);
  const [pagoMasivoModalOpen, setPagoMasivoModalOpen] = useState(false);
  const [pagoMasivoLoading, setPagoMasivoLoading] = useState(false);
  const [pagoMasivoError, setPagoMasivoError] = useState<string | null>(null);
  // Moneda seleccionada para conversión masiva (sincronizada con el modal)
  const [monedaConversion, setMonedaConversion] = useState<'USD' | 'Bs'>('USD');

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

  // Declarar cuentasFiltradas antes del useEffect de abonosPorCuenta
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

  // Memo para calcular montos convertidos por factura según moneda seleccionada
  const montosConvertidos = useMemo(() => {
    return cuentasFiltradas.reduce((acc, c) => {
      // Siempre calcular ambos montos: Bs y USD
      let montoBs = c.monto;
      let montoUSD = null;
      let retencionBs = c.retencion ?? 0;
      let retencionUSD = null;
      if (c.divisa === 'USD' && c.tasa && c.tasa > 0) {
        montoBs = c.monto * c.tasa;
        montoUSD = c.monto;
        retencionBs = (c.retencion ?? 0) * c.tasa;
        retencionUSD = c.retencion ?? 0;
      } else if (c.divisa === 'Bs' && c.tasa && c.tasa > 0) {
        montoUSD = c.monto / c.tasa;
        retencionUSD = (c.retencion ?? 0) / c.tasa;
      }
      acc[c._id] = {
        montoBs,
        montoUSD,
        retencionBs,
        retencionUSD,
        ...c // incluir todos los datos originales de la cuenta
      };
      return acc;
    }, {} as Record<string, any>);
  }, [cuentasFiltradas]);

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
      // Alerta visual inmediata
      alert(`El estatus de la cuenta fue cambiado a: ${confirmDialog.nuevoEstatus.toUpperCase()}`);
    } catch (err: any) {
      setError(err.message || "Error al actualizar estatus");
    } finally {
      setConfirmDialog({ open: false, id: null, nuevoEstatus: "" });
    }
  };

  const handleCancelChange = () => {
    setConfirmDialog({ open: false, id: null, nuevoEstatus: "" });
  };

  const handlePagosDropdownOpen = (open: boolean, cuenta: CuentaPorPagar) => {
    if (open && !pagosPorCuenta[cuenta._id]?.pagos) {
      setPagosPorCuenta(prev => ({
        ...prev,
        [cuenta._id]: { loading: true }
      }));
      fetch(`${API_BASE_URL}/api/pagoscpp?cuentaPorPagarId=${cuenta._id}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error("Error al obtener pagos");
          return res.json();
        })
        .then(data => {
          setPagosPorCuenta(prev => ({
            ...prev,
            [cuenta._id]: { loading: false, pagos: data }
          }));
          setTimeout(() => {
            animate(`.pagos-dropdown-item-${cuenta._id}`, {
              opacity: [0, 1],
              y: [20, 0],
              duration: 400,
              delay: stagger(60),
              ease: 'outCubic'
            });
          }, 10);
        })
        .catch(err => {
          setPagosPorCuenta(prev => ({
            ...prev,
            [cuenta._id]: { loading: false, error: err.message || "Error al obtener pagos" }
          }));
        });
    }
  };

  // Filtrar solo pagos aprobados antes de pasar a PagosDropdown
  const pagosAprobadosPorCuenta: { [key: string]: { loading: boolean, error?: string, pagos?: any[] } } = {};
  Object.entries(pagosPorCuenta).forEach(([cuentaId, info]) => {
    pagosAprobadosPorCuenta[cuentaId] = {
      ...info,
      pagos: info.pagos ? info.pagos.filter(p => p.estado === 'aprobado') : info.pagos
    };
  });

  // Selección múltiple
  const isAllSelected = cuentasFiltradas.length > 0 && selectedFacturas.length === cuentasFiltradas.length;
  const isIndeterminate = selectedFacturas.length > 0 && selectedFacturas.length < cuentasFiltradas.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFacturas([]);
    } else {
      setSelectedFacturas(cuentasFiltradas.map(c => c._id));
    }
  };

  const handleSelectFactura = (id: string) => {
    setSelectedFacturas(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // Lógica para registrar pago masivo (un pago individual por cada cuenta seleccionada)
  const handlePagoMasivo = async (form: any) => {
    setPagoMasivoLoading(true);
    setPagoMasivoError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      // Enviar un pago por cada cuenta seleccionada
      await Promise.all(
        selectedFacturas.map(async (facturaId) => {
          const cuenta = cuentasFiltradas.find(c => c._id === facturaId);
          if (!cuenta) return null;
          // Usar el monto convertido calculado en montosConvertidos si existe
          const monto = montosConvertidos[cuenta._id]?.monto ?? cuenta.monto;
          const payload = {
            fecha: form.fecha,
            moneda: form.moneda,
            monto,
            referencia: form.referencia,
            usuario: form.usuario,
            bancoEmisor: form.bancoEmisor,
            bancoReceptor: form.bancoReceptor,
            tasa: cuenta.tasa,
            imagenPago: form.imagenPago,
            farmaciaId: cuenta.farmacia,
            estado: 'aprobado',
            cuentaPorPagarId: cuenta._id,
          };
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/pagoscpp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Error al registrar pago");
          }
          return res.json();
        })
      );
      setSuccess("Pago registrado para todas las facturas seleccionadas");
      setPagoMasivoModalOpen(false);
      setSelectedFacturas([]);
      fetchCuentas();
    } catch (err: any) {
      setPagoMasivoError(err.message || "Error al registrar pago");
    } finally {
      setPagoMasivoLoading(false);
    }
  };

  // Función para validar la estructura de pagosInfo
  function isValidPagosInfo(pagosInfo: any): boolean {
    if (!pagosInfo || typeof pagosInfo !== 'object') return false;
    if (typeof pagosInfo.loading !== 'boolean') return false;
    if ('error' in pagosInfo && typeof pagosInfo.error !== 'string' && typeof pagosInfo.error !== 'undefined') return false;
    if ('pagos' in pagosInfo && !Array.isArray(pagosInfo.pagos)) return false;
    return true;
  }

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
              {/* Botón para pago masivo */}
              <div className="flex items-center gap-4 p-4">
                <button
                  className={`px-5 py-2 rounded-lg font-semibold shadow transition-all duration-200
                ${selectedFacturas.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  disabled={selectedFacturas.length === 0}
                  onClick={() => setPagoMasivoModalOpen(true)}
                >
                  Registrar Pago para Seleccionadas
                </button>
                {selectedFacturas.length > 0 && (
                  <span className="text-sm text-slate-600">{selectedFacturas.length} seleccionadas</span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-600">Mostrar montos convertidos a:</span>
                <button
                  className={`px-3 py-1 rounded ${monedaConversion === 'USD' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  onClick={() => setMonedaConversion('USD')}
                >USD</button>
                <button
                  className={`px-3 py-1 rounded ${monedaConversion === 'Bs' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  onClick={() => setMonedaConversion('Bs')}
                >Bs</button>
              </div>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-2 py-3.5 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Pagos</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Monto</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Retención</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Tasa</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Moneda</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Días para Vencer</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Recepción</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Proveedor</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Factura</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Control</th>
                    {/* El resto de columnas */}
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Descripción</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Usuario</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Farmacia</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Estatus</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {cuentasFiltradas
                    .slice()
                    .sort((a, b) => {
                      const diasA = calcularDiasRestantes(a.fechaEmision, a.diasCredito);
                      const diasB = calcularDiasRestantes(b.fechaEmision, b.diasCredito);
                      return diasA - diasB;
                    })
                    .map(c => {
                      // Calcular días para vencer y fecha de vencimiento para cada cuenta
                      return (
                        <React.Fragment key={c._id}>
                          <tr className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                            <td className="px-2 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedFacturas.includes(c._id)}
                                onChange={() => handleSelectFactura(c._id)}
                              />
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                let pagosInfo = pagosAprobadosPorCuenta[c._id] || {loading: false, pagos: []};
                                // Validar y normalizar pagosInfo para asegurar que cada pago tenga la moneda correcta
                                if (!isValidPagosInfo(pagosInfo)) {
                                  return (
                                    <div className="text-xs text-red-500 font-semibold">Error: pagosInfo inválido</div>
                                  );
                                }
                                // Normalizar moneda en cada pago (si falta, usar la moneda de la cuenta)
                                if (pagosInfo.pagos && Array.isArray(pagosInfo.pagos)) {
                                  pagosInfo = {
                                    ...pagosInfo,
                                    pagos: pagosInfo.pagos.map(p => {
                                      // Normalizar y priorizar la moneda real del pago
                                      let monedaPago = (typeof p.moneda === 'string' && p.moneda.trim()) ? p.moneda.toUpperCase() : (typeof c.divisa === 'string' ? c.divisa.toUpperCase() : 'BS');
                                      return {
                                        ...p,
                                        moneda: monedaPago,
                                        tasa: p.tasa || c.tasa,
                                        monedaCuenta: typeof c.divisa === 'string' ? c.divisa.toUpperCase() : 'BS',
                                        tasaCuenta: c.tasa,
                                        montoTotal: c.monto
                                      };
                                    })
                                  };
                                }
                                return (
                                  <PagosDropdown
                                    cuentaId={c._id}
                                    onOpenChange={open => handlePagosDropdownOpen(open, c)}
                                    pagosInfo={pagosInfo}
                                    montoTotal={c.monto}
                                    monedaCuenta={c.divisa}
                                    tasaCuenta={c.tasa}
                                  />
                                );
                              })()}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                              {/* Monto 1: siempre Bs (si la cuenta es USD, convertir a Bs). Monto 2: siempre USD (original o convertido). */}
                              <div className="font-bold text-indigo-700">
                                {(() => {
                                  const cuenta = c;
                                  const montoBs = cuenta.divisa === 'USD'
                                    ? cuenta.monto * (cuenta.tasa || 0)
                                    : cuenta.monto;
                                  return montoBs != null && !isNaN(montoBs)
                                    ? montoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES' })
                                    : '--';
                                })()}
                              </div>
                              <div className="text-xs text-slate-500 italic">
                                {(() => {
                                  const cuenta = c;
                                  const montoUSD = cuenta.divisa === 'USD'
                                    ? cuenta.monto
                                    : cuenta.tasa ? cuenta.monto / cuenta.tasa : null;
                                  return montoUSD != null && !isNaN(montoUSD)
                                    ? `Ref: ${montoUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
                                    : 'Ref: --';
                                })()}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                              {/* Retención 1: siempre Bs (si la cuenta es USD, convertir a Bs). Retención 2: siempre USD (original o convertido). */}
                              <div className="font-bold text-indigo-700">
                                {(() => {
                                  const cuenta = c;
                                  const retencionBs = cuenta.divisa === 'USD'
                                    ? (cuenta.retencion || 0) * (cuenta.tasa || 0)
                                    : cuenta.retencion;
                                  return retencionBs != null && !isNaN(retencionBs)
                                    ? retencionBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES' })
                                    : '--';
                                })()}
                              </div>
                              <div className="text-xs text-slate-500 italic">
                                {(() => {
                                  const cuenta = c;
                                  const retencionUSD = cuenta.divisa === 'USD'
                                    ? cuenta.retencion
                                    : cuenta.tasa ? (cuenta.retencion || 0) / cuenta.tasa : null;
                                  return retencionUSD != null && !isNaN(retencionUSD)
                                    ? `Ref: ${retencionUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
                                    : 'Ref: --';
                                })()}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-center">{c.tasa}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-center">{c.divisa}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-center">
                              {(() => {
                                const fechaVencimiento = new Date(new Date(c.fechaEmision).getTime() + c.diasCredito * 24 * 60 * 60 * 1000);
                                const hoy = new Date();
                                const diasParaVencer = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                                return diasParaVencer <= 0 ? (
                                  <span className="text-red-600 font-bold">Vencida</span>
                                ) : (
                                  <span className="text-slate-700 font-semibold">{diasParaVencer} días</span>
                                );
                              })()}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{formatFecha(c.fechaRecepcion)}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{c.proveedor}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.numeroFactura}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.numeroControl}</td>
                            {/* El resto de columnas */}
                            <td className="px-5 py-4 text-sm text-slate-700 max-w-sm truncate">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer underline decoration-dotted" tabIndex={0}>
                                      {c.descripcion.length > 50 ? c.descripcion.slice(0, 50) + '…' : c.descripcion}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="center" className="max-w-xs break-words whitespace-pre-line bg-white border border-slate-200 shadow-lg p-4 rounded-md text-slate-800 text-sm font-normal">
                                    {c.descripcion}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.usuarioCorreo}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.farmacia}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm"><EstatusBadge estatus={c.estatus} /></td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-center">
                              <select
                                value={c.estatus}
                                onChange={e => handleEstadoChange(c._id, e.target.value)}
                                className="border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-slate-700"
                              >
                                {ESTATUS_OPCIONES.map(opt => (
                                  <option key={opt} value={opt} disabled={opt === c.estatus}>
                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={18} className="py-2 px-4 bg-slate-50 text-left">
                              <button
                                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 font-medium text-xs shadow"
                                onClick={() => {
                                  setAbonoModalOpen(c._id);
                                  setAbonoCuenta(c);
                                }}
                              >
                                + Agregar pago a esta cuenta
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Diálogo de confirmación con mejor estilo */}
        {confirmDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Confirmar Cambio de Estatus</h2>
              <p className="text-slate-600 mb-4">
                ¿Está seguro que desea cambiar el estatus de la factura a
                <span className={`font-bold ml-1 ${confirmDialog.nuevoEstatus === 'anulada' ? 'text-red-600' : confirmDialog.nuevoEstatus === 'pagada' ? 'text-green-600' : 'text-yellow-600'}`}>{confirmDialog.nuevoEstatus}</span>?
              </p>
              {confirmDialog.nuevoEstatus === 'anulada' && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm">
                  <strong>Advertencia:</strong> Esta acción es irreversible. La cuenta será marcada como anulada.
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelChange}
                  className="px-5 py-2.5 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium transition-colors duration-150 ease-in-out"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmChange}
                  className={`px-5 py-2.5 rounded-md font-medium transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md ${confirmDialog.nuevoEstatus === 'anulada' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {cuentaSeleccionada && detalleModalOpen && (
          <ModalCuentasPorPagar
            cuentas={[cuentaSeleccionada]}
            farmaciaNombre={cuentaSeleccionada.farmacia}
            onConfirm={() => { }}
            onClose={() => { setDetalleModalOpen(false); setCuentaSeleccionada(null); }}
            loading={false}
            error={null}
          />
        )}

        {abonoModalOpen && abonoCuenta && (
          <AbonoModal
            open={!!abonoModalOpen}
            onClose={() => { setAbonoModalOpen(null); setAbonoCuenta(null); }}
            onSubmit={() => {
              setAbonoModalOpen(null);
              setAbonoCuenta(null);
              // Opcional: recargar pagos si es necesario
            }}
            usuario={abonoCuenta.usuarioCorreo || ''}
            cuentaPorPagarId={abonoCuenta._id}
            farmaciaId={abonoCuenta.farmacia}
          />
        )}

        {/* Modal para mostrar pagos */}
        <PagoMasivoModal
          open={pagoMasivoModalOpen}
          onClose={() => setPagoMasivoModalOpen(false)}
          facturaIds={selectedFacturas}
          cuentas={selectedFacturas.map(id => {
            const cuenta = cuentasFiltradas.find(c => c._id === id);
            if (!cuenta) return null;
            // Monto y retención en Bs (si USD, convertir), referencia en USD (si Bs, convertir)
            const montoBs = cuenta.divisa === 'USD' ? cuenta.monto * (cuenta.tasa || 0) : cuenta.monto;
            const montoUSD = cuenta.divisa === 'USD' ? cuenta.monto : cuenta.tasa ? cuenta.monto / cuenta.tasa : null;
            const retencionBs = cuenta.divisa === 'USD' ? (cuenta.retencion || 0) * (cuenta.tasa || 0) : cuenta.retencion;
            const retencionUSD = cuenta.divisa === 'USD' ? cuenta.retencion : cuenta.tasa ? (cuenta.retencion || 0) / cuenta.tasa : null;
            return {
              ...cuenta,
              monto: montoBs,
              referenciaUSD: montoUSD,
              retencion: retencionBs,
              retencionUSD: retencionUSD
            };
          }).filter(Boolean)}
          onSubmit={handlePagoMasivo}
          loading={pagoMasivoLoading}
          error={pagoMasivoError}
          monedaConversion={monedaConversion}
          setMonedaConversion={setMonedaConversion}
        />
      </div>
    </div>
  );
};

export default VisualizarCuentasPorPagarPage;