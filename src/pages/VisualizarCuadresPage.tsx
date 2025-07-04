import React, { useEffect, useState } from "react";
import { FaRegFileAlt } from "react-icons/fa";
import CuadresModal from "@/components/CuadresModal";
import CuadreDetalleModal from "@/components/CuadreDetalleModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Cuadre {
  _id: string;
  dia: string;
  cajaNumero: number;
  turno: string;
  estado: string;
  totalCajaSistemaBs?: number;
  totalGeneralUsd?: number;
  faltanteUsd?: number;
  sobranteUsd?: number;
  cajero?: string;
  farmacia?: string;
  nombreFarmacia?: string;
  codigoFarmacia?: string;
  tasa?: number;
  devolucionesBs?: number;
  recargaBs?: number;
  pagomovilBs?: number;
  puntosVenta?: { banco: string; puntoDebito: string; puntoCredito: string }[];
  efectivoBs?: number;
  totalBs?: number;
  totalBsEnUsd?: number;
  efectivoUsd?: number;
  zelleUsd?: number;
  diferenciaUsd?: number;
  cajeroId?: string;
  valesUsd?: number;
  valesBs?: number;
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ESTADO_OPCIONES = ["verified", "wait", "denied"];

const VisualizarCuadresPage: React.FC = () => {
  const [cuadres, setCuadres] = useState<Cuadre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string | null; nuevoEstado: string }>({ open: false, id: null, nuevoEstado: "" });
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");
  const [turnoFiltro, setTurnoFiltro] = useState<string>("");
  const [cajeroFiltro, setCajeroFiltro] = useState<string>(""); // Nuevo filtro
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [cuadreSeleccionado, setCuadreSeleccionado] = useState<Cuadre | null>(null);

  const fetchCuadres = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/cuadres/all`);
      if (!res.ok) throw new Error("Error al obtener cuadres");
      const data = await res.json();
      setCuadres(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener cuadres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuadres();
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

  const handleEstadoChange = (id: string, nuevoEstado: string) => {
    setConfirmDialog({ open: true, id, nuevoEstado });
  };

  const handleConfirmChange = async () => {
    if (!confirmDialog.id) return;
    setError(null);
    setSuccess(null);
    try {
      // Se asume que el backend tiene un endpoint PATCH /cuadres/{farmacia_id}/{cuadre_id}/estado
      // Se debe obtener el id de la farmacia del cuadre
      const cuadre = cuadres.find(c => c._id === confirmDialog.id);
      if (!cuadre || !cuadre.farmacia) throw new Error("No se encontró la farmacia del cuadre");
      const res = await fetch(`${API_BASE_URL}/cuadres/${cuadre.farmacia}/${confirmDialog.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: confirmDialog.nuevoEstado })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al actualizar estado");
      }
      setSuccess("Estado actualizado correctamente");
      setCuadres(prev => prev.map(c => c._id === confirmDialog.id ? { ...c, estado: confirmDialog.nuevoEstado } : c));
    } catch (err: any) {
      setError(err.message || "Error al actualizar estado");
    } finally {
      setConfirmDialog({ open: false, id: null, nuevoEstado: "" });
    }
  };

  const handleCancelChange = () => {
    setConfirmDialog({ open: false, id: null, nuevoEstado: "" });
  };

  const cuadresFiltrados = cuadres
    .filter(c => {
      if (!selectedFarmacia) return true;
      // Filtra por el ID real de la farmacia (codigoFarmacia)
      return c.codigoFarmacia === selectedFarmacia;
    })
    .filter(c => !turnoFiltro || (c.turno || "").toLowerCase().includes(turnoFiltro.toLowerCase()))
    .filter(c => !cajeroFiltro || (c.cajero || "").toLowerCase().includes(cajeroFiltro.toLowerCase())) // Filtro por cajero
    .filter(c => !estadoFiltro || c.estado === estadoFiltro)
    .filter(c => {
      if (!fechaInicio && !fechaFin) return true;
      const fecha = c.dia?.slice(0, 10);
      if (fechaInicio && fecha < fechaInicio) return false;
      if (fechaFin && fecha > fechaFin) return false;
      return true;
    })
    .sort((a, b) => (a.dia > b.dia ? -1 : 1));


  // Calcular totales agrupados por moneda y tipo de transacción
  const totalesCalculados = React.useMemo(() => {
    let efectivoBs = 0, pagoMovilBs = 0, debitoBs = 0, creditoBs = 0;
    let efectivoBsEnUsd = 0, pagoMovilBsEnUsd = 0, debitoUsd = 0, creditoUsd = 0;
    let efectivoUsd = 0, zelleUsd = 0;
    let efectivoUsdEnBs = 0, zelleUsdEnBs = 0;

    cuadresFiltrados.forEach(c => {
      const tasa = Number(c.tasa) || 1;
      // Bs
      efectivoBs += Number(c.efectivoBs) || 0;
      pagoMovilBs += Number(c.pagomovilBs) || 0;
      const debito = Array.isArray(c.puntosVenta) ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0), 0) : 0;
      const credito = Array.isArray(c.puntosVenta) ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoCredito) || 0), 0) : 0;
      debitoBs += debito;
      creditoBs += credito;
      // Bs en USD
      efectivoBsEnUsd += tasa > 0 ? (Number(c.efectivoBs) || 0) / tasa : 0;
      pagoMovilBsEnUsd += tasa > 0 ? (Number(c.pagomovilBs) || 0) / tasa : 0;
      debitoUsd += tasa > 0 ? debito / tasa : 0;
      creditoUsd += tasa > 0 ? credito / tasa : 0;
      // USD
      efectivoUsd += Number(c.efectivoUsd) || 0;
      zelleUsd += Number(c.zelleUsd) || 0;
      // USD en Bs
      efectivoUsdEnBs += (Number(c.efectivoUsd) || 0) * tasa;
      zelleUsdEnBs += (Number(c.zelleUsd) || 0) * tasa;
    });

    return {
      efectivoBs,
      pagoMovilBs,
      debitoBs,
      creditoBs,
      efectivoBsEnUsd,
      pagoMovilBsEnUsd,
      debitoUsd,
      creditoUsd,
      efectivoUsd,
      zelleUsd,
      efectivoUsdEnBs,
      zelleUsdEnBs
    };
  }, [cuadresFiltrados]);

  // Eliminar calculandoTotales y calcularTotales porque ya no se usan

  // El return debe estar dentro del cuerpo del componente, no fuera de ninguna función ni bloque
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800 text-center flex-1">Visualizar Cuadres</h1>
          <button
            className="ml-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
            onClick={() => setModalOpen(true)}
            title="Ver todos los cuadres"
          >
            <FaRegFileAlt className="text-xl" />
            <span className="hidden sm:inline">Ver Cuadres</span>
          </button>
        </div>
        <CuadresModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          farmaciaId={selectedFarmacia || (farmacias[0]?.id || "")}
          farmaciaNombre={farmacias.find(f => f.id === selectedFarmacia)?.nombre || farmacias[0]?.nombre || ""}
        />
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
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Filtros</h2>
          {farmacias.length > 1 && (
            <div className="mb-6">
              <span className="font-medium text-slate-700 mr-3">Farmacias:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {farmacias.map(f => (
                  <button
                    key={f.id}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-in-out ${selectedFarmacia === f.id ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-300'}`}
                    onClick={() => setSelectedFarmacia(f.id === selectedFarmacia ? "" : f.id)}
                  >
                    {f.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Turno</label>
              <input
                type="text"
                value={turnoFiltro}
                onChange={e => setTurnoFiltro(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
                placeholder="Buscar turno..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Cajero</label>
              <input
                type="text"
                value={cajeroFiltro}
                onChange={e => setCajeroFiltro(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
                placeholder="Buscar cajero..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
              <select
                value={estadoFiltro}
                onChange={e => setEstadoFiltro(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
              >
                <option value="">Todos</option>
                {ESTADO_OPCIONES.map(opt => (
                  <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
              />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando cuadres...
          </div>
        ) : cuadresFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay cuadres</h3>
            <p className="mt-1 text-sm text-slate-500">No se encontraron cuadres que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      {["", "Fecha", "Farmacia", "Caja", "Cajero", "Turno", "Estado", "Tasa", "Efectivo Bs", "Devoluciones Bs", "Recarga Bs", "Pago Móvil Bs", "Punto Débito", "Punto Crédito", "Puntos Venta", "Total Bs", "Total Bs en USD", "Efectivo USD", "Zelle USD", "Total USD", "Sobrante USD", "Faltante USD", "Diferencia USD", "Acción"].map(header => (
                        <th key={header} scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {cuadresFiltrados.map(c => {
                      const debito = Array.isArray(c.puntosVenta) ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito as any) || 0), 0) : 0;
                      const credito = Array.isArray(c.puntosVenta) ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoCredito as any) || 0), 0) : 0;
                      return (
                        <tr key={c._id} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                          <td className="px-2 py-4 whitespace-nowrap text-sm">
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver detalles del cuadre"
                              onClick={() => { setCuadreSeleccionado(c); setDetalleModalOpen(true); }}
                            >
                              <FaRegFileAlt />
                            </button>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.dia?.slice(0, 10)}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.nombreFarmacia || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.cajaNumero}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.cajero || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.turno}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{c.estado}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.tasa?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.efectivoBs?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.devolucionesBs?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.recargaBs?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.pagomovilBs?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{debito.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{credito.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{Array.isArray(c.puntosVenta) ? c.puntosVenta.length : '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.totalBs?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.totalBsEnUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.efectivoUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.zelleUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.totalGeneralUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-green-700 text-right">{c.sobranteUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-red-700 text-right">{c.faltanteUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">{c.diferenciaUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm">
                            <select
                              value={c.estado}
                              onChange={e => handleEstadoChange(c._id, e.target.value)}
                              className="border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-1.5 px-2 text-xs"
                            >
                              {ESTADO_OPCIONES.map(opt => (
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
            {/* Bloque de totales fuera de la tabla */}
            <div className="mt-8">
              {/* Bloques de totales detallados con animación de entrada */}
              {totalesCalculados && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-totales-detallados">
                  {/* Moneda Nacional (Bs) */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-200 rounded-2xl p-8 shadow-xl border-2 border-blue-300 flex flex-col items-center transition-transform hover:scale-105 duration-300 moneda-nacional-block">
                    <h3 className="text-2xl font-extrabold mb-4 text-blue-800 flex items-center gap-2">
                      <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4h-4m-8 0H4" /></svg>
                      Moneda Nacional (Bs)
                    </h3>
                    <table className="min-w-full text-base rounded-lg overflow-hidden">
                      <thead>
                        <tr>
                          <th className="text-left font-semibold pb-2">Tipo</th>
                          <th className="text-right font-semibold pb-2">Bs</th>
                          <th className="text-right font-semibold pb-2">USD (conv.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        <tr><td>Efectivo</td><td className="text-right">{totalesCalculados.efectivoBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td><td className="text-right">{totalesCalculados.efectivoBsEnUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td></tr>
                        <tr><td>Pago Móvil</td><td className="text-right">{totalesCalculados.pagoMovilBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td><td className="text-right">{totalesCalculados.pagoMovilBsEnUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td></tr>
                        <tr><td>Débito</td><td className="text-right">{totalesCalculados.debitoBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td><td className="text-right">{totalesCalculados.debitoUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td></tr>
                        <tr><td>Crédito</td><td className="text-right">{totalesCalculados.creditoBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td><td className="text-right">{totalesCalculados.creditoUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td></tr>
                      </tbody>
                      <tfoot>
                        <tr className="font-bold border-t border-blue-200">
                          <td>Total Bs</td>
                          <td className="text-right text-blue-900">{(totalesCalculados.efectivoBs + totalesCalculados.pagoMovilBs + totalesCalculados.debitoBs + totalesCalculados.creditoBs).toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="text-right text-blue-900">{(totalesCalculados.efectivoBsEnUsd + totalesCalculados.pagoMovilBsEnUsd + totalesCalculados.debitoUsd + totalesCalculados.creditoUsd).toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {/* Moneda Extranjera (USD) */}
                  <div className="bg-gradient-to-br from-green-50 to-green-200 rounded-2xl p-8 shadow-xl border-2 border-green-300 flex flex-col items-center transition-transform hover:scale-105 duration-300 moneda-extranjera-block">
                    <h3 className="text-2xl font-extrabold mb-4 text-green-800 flex items-center gap-2">
                      <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4h-4m-8 0H4" /></svg>
                      Moneda Extranjera (USD)
                    </h3>
                    <table className="min-w-full text-base rounded-lg overflow-hidden">
                      <thead>
                        <tr>
                          <th className="text-left font-semibold pb-2">Tipo</th>
                          <th className="text-right font-semibold pb-2">USD</th>
                          <th className="text-right font-semibold pb-2">Bs (conv.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-100">
                        <tr><td>Efectivo</td><td className="text-right">{totalesCalculados.efectivoUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td><td className="text-right">{totalesCalculados.efectivoUsdEnBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td></tr>
                        <tr><td>Zelle</td><td className="text-right">{totalesCalculados.zelleUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td><td className="text-right">{totalesCalculados.zelleUsdEnBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td></tr>
                      </tbody>
                      <tfoot>
                        <tr className="font-bold border-t border-green-200">
                          <td>Total USD</td>
                          <td className="text-right text-green-900">{(totalesCalculados.efectivoUsd + totalesCalculados.zelleUsd).toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                          <td className="text-right text-green-900">{(totalesCalculados.efectivoUsdEnBs + totalesCalculados.zelleUsdEnBs).toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Bloque de resumen: Total Bs y Total USD discriminados con y sin vales */}
              {cuadresFiltrados.length > 0 && (
                <div className="mt-10 flex flex-col items-center justify-center animate-totales-detallados">
                  <div className="w-full max-w-4xl rounded-lg border shadow-lg overflow-hidden mb-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableHead className="w-[200px] text-lg font-semibold text-gray-700 dark:text-gray-200">Totales</TableHead>
                          <TableHead className="text-right text-lg font-semibold text-gray-700 dark:text-gray-200">Total Bs</TableHead>
                          <TableHead className="text-right text-lg font-semibold text-gray-700 dark:text-gray-200">Total USD</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Fila para "Con vales (sin ajustes)" */}
                        <TableRow className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                          <TableCell className="font-medium text-blue-800 dark:text-blue-200 py-4 pl-6">Con vales (sin ajustes)</TableCell>
                          <TableCell className="text-right text-blue-800 dark:text-blue-200 font-mono text-base">
                            {(() => {
                              let totalBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoBs) || 0)
                                  + (Number(c.pagomovilBs) || 0)
                                  + (Array.isArray(c.puntosVenta)
                                    ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                    : 0)
                                  + (((Number(c.efectivoUsd) || 0) + (Number(c.zelleUsd) || 0)) * tasa)
                                  + (Number(c.valesBs) || 0)
                                  + ((Number(c.valesUsd) || 0) * tasa);
                                return acc + subtotal;
                              }, 0);
                              return totalBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-green-800 dark:text-green-200 font-mono text-base">
                            {(() => {
                              let totalUsd = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoUsd) || 0)
                                  + (Number(c.zelleUsd) || 0)
                                  + (((Number(c.efectivoBs) || 0)
                                    + (Number(c.pagomovilBs) || 0)
                                    + (Array.isArray(c.puntosVenta)
                                      ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                      : 0)
                                    + (Number(c.valesBs) || 0)) / tasa)
                                  + (Number(c.valesUsd) || 0);
                                return acc + subtotal;
                              }, 0);
                              return totalUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                        </TableRow>

                        {/* Fila para "Sin vales (sin ajustes)" */}
                        <TableRow className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors">
                          <TableCell className="font-medium text-blue-800 dark:text-blue-200 py-4 pl-6">Sin vales (sin ajustes)</TableCell>
                          <TableCell className="text-right text-blue-800 dark:text-blue-200 font-mono text-base">
                            {(() => {
                              let totalBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoBs) || 0)
                                  + (Number(c.pagomovilBs) || 0)
                                  + (Array.isArray(c.puntosVenta)
                                    ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                    : 0)
                                  + (((Number(c.efectivoUsd) || 0) + (Number(c.zelleUsd) || 0)) * tasa);
                                return acc + subtotal;
                              }, 0);
                              return totalBs.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-green-800 dark:text-green-200 font-mono text-base">
                            {(() => {
                              let totalUsd = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoUsd) || 0)
                                  + (Number(c.zelleUsd) || 0)
                                  + (((Number(c.efectivoBs) || 0)
                                    + (Number(c.pagomovilBs) || 0)
                                    + (Array.isArray(c.puntosVenta)
                                      ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                      : 0)) / tasa);
                                return acc + subtotal;
                              }, 0);
                              return totalUsd.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                        </TableRow>
                        {/* Fila para "Con vales (ajustado)" */}
                        <TableRow className="bg-blue-100/70 dark:bg-blue-900/40 hover:bg-blue-200/70 dark:hover:bg-blue-900/60 transition-colors">
                          <TableCell className="font-bold text-lg text-blue-900 dark:text-blue-100 py-4 pl-6">Con vales (ajustado)</TableCell>
                          <TableCell className="text-right font-extrabold text-2xl text-blue-900 dark:text-blue-100 font-mono">
                            {(() => {
                              let totalBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoBs) || 0)
                                  + (Number(c.pagomovilBs) || 0)
                                  + (Array.isArray(c.puntosVenta)
                                    ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                    : 0)
                                  + (((Number(c.efectivoUsd) || 0) + (Number(c.zelleUsd) || 0)) * tasa)
                                  + (Number(c.valesBs) || 0)
                                  + ((Number(c.valesUsd) || 0) * tasa);
                                return acc + subtotal;
                              }, 0);
                              const totalFaltanteBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                return acc + ((Number(c.faltanteUsd) || 0) * tasa);
                              }, 0);
                              const totalSobranteBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                return acc + ((Number(c.sobranteUsd) || 0) * tasa);
                              }, 0);
                              const totalFinal = totalBs + totalFaltanteBs - totalSobranteBs;
                              return totalFinal.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-extrabold text-2xl text-green-900 dark:text-green-100 font-mono">
                            {(() => {
                              let totalUsd = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoUsd) || 0)
                                  + (Number(c.zelleUsd) || 0)
                                  + (((Number(c.efectivoBs) || 0)
                                    + (Number(c.pagomovilBs) || 0)
                                    + (Array.isArray(c.puntosVenta)
                                      ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                      : 0)
                                    + (Number(c.valesBs) || 0)) / tasa)
                                  + (Number(c.valesUsd) || 0);
                                return acc + subtotal;
                              }, 0);
                              const totalFaltanteUsd = cuadresFiltrados.reduce((acc, c) => {
                                return acc + ((Number(c.faltanteUsd) || 0));
                              }, 0);
                              const totalSobranteUsd = cuadresFiltrados.reduce((acc, c) => {
                                return acc + ((Number(c.sobranteUsd) || 0));
                              }, 0);
                              const totalFinal = totalUsd + totalFaltanteUsd - totalSobranteUsd;
                              return totalFinal.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                        </TableRow>

                        {/* Fila para "Sin vales (ajustado)" */}
                        <TableRow className="bg-blue-100/70 dark:bg-blue-900/40 hover:bg-blue-200/70 dark:hover:bg-blue-900/60 transition-colors">
                          <TableCell className="font-bold text-lg text-blue-900 dark:text-blue-100 py-4 pl-6">Sin vales (ajustado)</TableCell>
                          <TableCell className="text-right font-extrabold text-2xl text-blue-900 dark:text-blue-100 font-mono">
                            {(() => {
                              let totalBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoBs) || 0)
                                  + (Number(c.pagomovilBs) || 0)
                                  + (Array.isArray(c.puntosVenta)
                                    ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                    : 0)
                                  + (((Number(c.efectivoUsd) || 0) + (Number(c.zelleUsd) || 0)) * tasa);
                                return acc + subtotal;
                              }, 0);
                              const totalFaltanteBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                return acc + ((Number(c.faltanteUsd) || 0) * tasa);
                              }, 0);
                              const totalSobranteBs = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                return acc + ((Number(c.sobranteUsd) || 0) * tasa);
                              }, 0);
                              const totalFinal = totalBs + totalFaltanteBs - totalSobranteBs;
                              return totalFinal.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-extrabold text-2xl text-green-900 dark:text-green-100 font-mono">
                            {(() => {
                              let totalUsd = cuadresFiltrados.reduce((acc, c) => {
                                const tasa = c.tasa !== undefined && c.tasa !== null ? Number(Number(c.tasa).toFixed(4)) : 1;
                                const subtotal = (Number(c.efectivoUsd) || 0)
                                  + (Number(c.zelleUsd) || 0)
                                  + (((Number(c.efectivoBs) || 0)
                                    + (Number(c.pagomovilBs) || 0)
                                    + (Array.isArray(c.puntosVenta)
                                      ? c.puntosVenta.reduce((a, pv) => a + (parseFloat(pv.puntoDebito) || 0) + (parseFloat(pv.puntoCredito) || 0), 0)
                                      : 0)) / tasa);
                                return acc + subtotal;
                              }, 0);
                              const totalFaltanteUsd = cuadresFiltrados.reduce((acc, c) => {
                                return acc + ((Number(c.faltanteUsd) || 0));
                              }, 0);
                              const totalSobranteUsd = cuadresFiltrados.reduce((acc, c) => {
                                return acc + ((Number(c.sobranteUsd) || 0));
                              }, 0);
                              const totalFinal = totalUsd + totalFaltanteUsd - totalSobranteUsd;
                              return totalFinal.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                        </TableRow>
                        {/* Fila para "Total Caja Sistema (Bs)" */}
                        <TableRow className="bg-yellow-50 dark:bg-yellow-900/30">
                          <TableCell className="font-bold text-lg text-yellow-800 dark:text-yellow-200 py-4 pl-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4h-4m-8 0H4" /></svg>
                            Total Caja Sistema (Bs)
                          </TableCell>
                          <TableCell className="text-right font-bold text-yellow-800 dark:text-yellow-200 font-mono text-lg" colSpan={2}>
                            {(() => {
                              let totalCajaSistema = cuadresFiltrados.reduce((acc, c) => acc + (Number(c.totalCajaSistemaBs) || 0), 0);
                              return totalCajaSistema.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Resumen de totales en Bs y USD, discriminados con y sin vales, ajustados y sin ajustar. Incluye el total de caja sistema reportado.</p>
                </div>
              )}
              
            </div>
            {confirmDialog.open && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm p-4">
                <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full">
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">Confirmar Cambio de Estado</h2>
                  <p className="text-slate-600 mb-4">
                    ¿Está seguro que desea cambiar el estado del cuadre a
                    <span className={`font-bold ml-1 ${confirmDialog.nuevoEstado === 'denied' ? 'text-red-600' : confirmDialog.nuevoEstado === 'verified' ? 'text-green-600' : 'text-yellow-600'}`}>{confirmDialog.nuevoEstado}</span>?
                  </p>
                  {confirmDialog.nuevoEstado === 'denied' && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm">
                      <strong>Advertencia:</strong> Esta acción es irreversible. El cuadre será marcado como rechazado.
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
                      className={`px-5 py-2.5 rounded-md font-medium transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md ${confirmDialog.nuevoEstado === 'denied' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              </div>
            )}
            {cuadreSeleccionado && detalleModalOpen && (
              <CuadreDetalleModal
                open={detalleModalOpen}
                onClose={() => { setDetalleModalOpen(false); setCuadreSeleccionado(null); }}
                cuadre={cuadreSeleccionado}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizarCuadresPage;
