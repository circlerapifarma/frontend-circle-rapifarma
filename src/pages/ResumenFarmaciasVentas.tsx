import React, { useEffect, useState, useCallback } from "react";
import ResumeCardFarmacia from "@/components/ResumeCardFarmacia"; // Assuming this path is correct

// Consider moving these interfaces to a shared types file
type VentasFarmacia = {
  totalVentas: number;
  totalBs: number;
  totalUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  faltantes: number;
  sobrantes: number;
  totalGeneralSinRecargas: number;
  valesUsd: number;
};

// Interface for Cuadre data, as it's used directly
interface Cuadre {
  dia: string;
  estado: "verified" | "wait" | "denied"; // Assuming these states
  recargaBs?: number;
  pagomovilBs?: number;
  efectivoBs?: number;
  puntosVenta?: { puntoDebito?: number; puntoCredito?: number }[];
  efectivoUsd?: number;
  zelleUsd?: number;
  tasa?: number;
  faltanteUsd?: number;
  sobranteUsd?: number;
  valesUsd?: number;
  devolucionesBs?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ResumenFarmaciasVentas: React.FC = () => {
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [ventas, setVentas] = useState<{ [key: string]: VentasFarmacia }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fecha de inicio y fin como string para inputs de tipo "date"
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  // Estado para controlar la visibilidad de los detalles extendidos de cada tarjeta
  const [detallesVisibles, setDetallesVisibles] = useState<{ [key: string]: boolean }>({});
  // Guarda los cuadres crudos por farmacia
  const [cuadresPorFarmacia, setCuadresPorFarmacia] = useState<{ [key: string]: Cuadre[] }>({});

  // --- Helper Functions for Date Filtering ---
  // Using useCallback for memoization, beneficial for performance
  const setDateRange = useCallback((start: Date, end: Date) => {
    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    setFechaInicio(formatDate(start));
    setFechaFin(formatDate(end));
  }, []);

  const setHoy = useCallback(() => {
    const hoy = new Date();
    setDateRange(hoy, hoy);
  }, [setDateRange]);

  const setAyer = useCallback(() => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    setDateRange(ayer, ayer);
  }, [setDateRange]);

  const setSemanaActual = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // Adjust for Sunday (0)
    const monday = new Date(today.setDate(today.getDate() + diffToMonday));
    const sunday = new Date(today.setDate(today.getDate() + 6)); // From adjusted monday
    setDateRange(monday, sunday);
  }, [setDateRange]);

  const setQuincenaActual = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    let startDay: Date, endDay: Date;

    if (today.getDate() < 16) {
      startDay = new Date(year, month, 1);
      endDay = new Date(year, month, 15);
    } else {
      startDay = new Date(year, month, 16);
      endDay = new Date(year, month + 1, 0); // Last day of current month
    }
    setDateRange(startDay, endDay);
  }, [setDateRange]);

  const setMesActual = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0); // Last day of current month
    setDateRange(firstDay, lastDay);
  }, [setDateRange]);

  // --- Fetching Farmacias and Cuadres ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Farmacias
        const resFarmacias = await fetch(`${API_BASE_URL}/farmacias`);
        if (!resFarmacias.ok) throw new Error("Error al obtener farmacias.");
        const dataFarmacias = await resFarmacias.json();
        const listaFarmacias = dataFarmacias.farmacias
          ? Object.entries(dataFarmacias.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(dataFarmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(listaFarmacias);

        // Fetch All Cuadres
        const resultCuadres: { [key: string]: Cuadre[] } = {};
        // Using Promise.allSettled to handle potential errors in individual farmacia fetches gracefully
        const cuadrePromises = listaFarmacias.map(async (farm) => {
          try {
            const resCuadres = await fetch(`${API_BASE_URL}/cuadres/${farm.id}`);
            if (!resCuadres.ok) {
              console.error(`Error al cargar cuadres para ${farm.nombre}:`, resCuadres.statusText);
              return { farmId: farm.id, data: [] }; // Return empty array on error
            }
            const data = await resCuadres.json();
            return { farmId: farm.id, data };
          } catch (err) {
            console.error(`Excepción al cargar cuadres para ${farm.nombre}:`, err);
            return { farmId: farm.id, data: [] };
          }
        });

        const settledResults = await Promise.allSettled(cuadrePromises);
        settledResults.forEach(settledResult => {
          if (settledResult.status === 'fulfilled') {
            resultCuadres[settledResult.value.farmId] = settledResult.value.data;
          }
        });
        setCuadresPorFarmacia(resultCuadres);

      } catch (err: any) {
        console.error("Error al cargar datos iniciales:", err);
        setError(err.message || "Error desconocido al cargar datos iniciales.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
    // Set initial date range to current month
    setMesActual(); // Set to current month by default
  }, []); // Empty dependency array means this runs once on mount

  // --- Calculate Sales based on Filters ---
  useEffect(() => {
    const ventasPorFarmacia: { [key: string]: VentasFarmacia } = {};
    farmacias.forEach((farm) => {
      const data = cuadresPorFarmacia[farm.id] || [];
      let totalBs = 0,
        totalUsd = 0,
        totalGeneral = 0,
        efectivoUsd = 0,
        zelleUsd = 0,
        faltantes = 0,
        sobrantes = 0,
        totalGeneralSinRecargas = 0,
        valesUsd = 0;

      data.forEach((c) => {
        // Filter by verified status and date range
        if (c.estado !== "verified") return;
        if ((fechaInicio && c.dia < fechaInicio) || (fechaFin && c.dia > fechaFin)) return;

        let sumaBs = Number(c.recargaBs || 0) + Number(c.pagomovilBs || 0) + Number(c.efectivoBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaBs += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0), 0);
        }
        totalBs += sumaBs;

        const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
        totalUsd += sumaUsd;
        efectivoUsd += Number(c.efectivoUsd || 0);
        zelleUsd += Number(c.zelleUsd || 0);

        const tasa = Number(c.tasa || 0);
        if (tasa > 0) {
          totalGeneral += sumaUsd + sumaBs / tasa;
          totalGeneralSinRecargas += sumaUsd + (sumaBs - Number(c.recargaBs || 0)) / tasa;
        } else {
          totalGeneral += sumaUsd;
          totalGeneralSinRecargas += sumaUsd;
        }
        faltantes += Number(c.faltanteUsd || 0);
        sobrantes += Number(c.sobranteUsd || 0);
        valesUsd += Number(c.valesUsd || 0);
      });

      ventasPorFarmacia[farm.id] = {
        totalVentas: Number(totalGeneral.toFixed(2)),
        totalBs: Number(totalBs.toFixed(2)),
        totalUsd: Number(totalUsd.toFixed(2)),
        efectivoUsd: Number(efectivoUsd.toFixed(2)),
        zelleUsd: Number(zelleUsd.toFixed(2)),
        faltantes: Number(faltantes.toFixed(2)),
        sobrantes: Number(sobrantes.toFixed(2)),
        totalGeneralSinRecargas: Number(totalGeneralSinRecargas.toFixed(2)),
        valesUsd: Number(valesUsd.toFixed(2)),
      };
    });
    setVentas(ventasPorFarmacia);
  }, [cuadresPorFarmacia, farmacias, fechaInicio, fechaFin]);

  // --- Calculate Pending Sales ---
  const pendientesPorFarmacia: { [key: string]: number } = {};
  farmacias.forEach((farm) => {
    const data = cuadresPorFarmacia[farm.id] || [];
    let totalPendiente = 0;
    data.forEach((c) => {
      // Only "wait" status and within selected date range
      if (c.estado !== "wait") return;
      if ((fechaInicio && c.dia < fechaInicio) || (fechaFin && c.dia > fechaFin)) return;

      let sumaBs = Number(c.recargaBs || 0) + Number(c.pagomovilBs || 0) + Number(c.efectivoBs || 0);
      if (Array.isArray(c.puntosVenta)) {
        sumaBs += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0), 0);
      }
      sumaBs -= Number(c.devolucionesBs || 0); // Subtracting devolucionesBs from pending Bs
      const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
      const tasa = Number(c.tasa || 0);
      if (tasa > 0) {
        totalPendiente += sumaUsd + sumaBs / tasa;
      } else {
        totalPendiente += sumaUsd;
      }
    });
    pendientesPorFarmacia[farm.id] = Number(totalPendiente.toFixed(2));
  });

  // Sort farmacias by total sales for TOP 3 display
  const sortedFarmacias = [...farmacias].sort((a, b) => {
    const ventasA = ventas[a.id]?.totalVentas || 0;
    const ventasB = ventas[b.id]?.totalVentas || 0;
    return ventasB - ventasA;
  });

  // --- Detailed Cuadre View (Collapsed/Expanded) ---
  const calcularDetalles = useCallback((farmId: string) => {
    const ventasFarm = ventas[farmId];
    if (!ventasFarm) return null;

    const cuadresFarmacia = cuadresPorFarmacia[farmId] || [];
    let sumaRecargaBs = 0,
      sumaPagomovilBs = 0,
      sumaEfectivoBs = 0,
      sumaPuntoDebito = 0,
      sumaPuntoCredito = 0,
      sumaDevolucionesBs = 0;

    cuadresFarmacia.forEach((c) => {
      // Apply date filters to the detailed view as well
      if (c.estado !== "verified") return; // Only verified cuadres for details
      if ((fechaInicio && c.dia < fechaInicio) || (fechaFin && c.dia > fechaFin)) return;

      sumaRecargaBs += Number(c.recargaBs || 0);
      sumaPagomovilBs += Number(c.pagomovilBs || 0);
      sumaEfectivoBs += Number(c.efectivoBs || 0);
      sumaDevolucionesBs += Number(c.devolucionesBs || 0);

      if (Array.isArray(c.puntosVenta)) {
        sumaPuntoDebito += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoDebito || 0), 0);
        sumaPuntoCredito += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoCredito || 0), 0);
      }
    });

    const formatBs = (amount: number) => amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Bs";

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 text-sm shadow-inner animate-fade-in">
        <h4 className="text-md font-bold text-gray-800 mb-3 border-b pb-2">Detalles Adicionales del Cuadre</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex justify-between"><span>Recarga Bs:</span><span className="font-medium">{formatBs(sumaRecargaBs)}</span></div>
          <div className="flex justify-between"><span>Pago Móvil Bs:</span><span className="font-medium">{formatBs(sumaPagomovilBs)}</span></div>
          <div className="flex justify-between"><span>Efectivo Bs:</span><span className="font-medium">{formatBs(sumaEfectivoBs)}</span></div>
          <div className="flex justify-between"><span>Punto Débito Bs:</span><span className="font-medium">{formatBs(sumaPuntoDebito)}</span></div>
          <div className="flex justify-between"><span>Punto Crédito Bs:</span><span className="font-medium">{formatBs(sumaPuntoCredito)}</span></div>
          <div className="flex justify-between"><span>Devoluciones Bs:</span><span className="font-medium text-red-600">{formatBs(sumaDevolucionesBs)}</span></div>
        </div>
      </div>
    );
  }, [ventas, cuadresPorFarmacia, fechaInicio, fechaFin]); // Dependencies for useCallback

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="flex items-center text-blue-700 text-lg font-semibold">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando resumen de ventas...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center text-red-700 font-semibold border border-red-300">
          <p className="text-xl mb-4">⚠️ ¡Oops! Algo salió mal.</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* --- Header Section --- */}
        <header className="bg-white rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-800 mb-2">
              <i className="fas fa-chart-bar text-blue-500 mr-3"></i>
              Resumen de Ventas por Farmacia
            </h1>
            <p className="text-gray-600 text-md">
              Consulta un desglose detallado de las ventas de cada farmacia.
            </p>
          </div>

          {/* --- Date Filters Section --- */}
          <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[400px]">
            <label htmlFor="fecha-inicio" className="block text-sm font-medium text-gray-700">
              Período de Ventas:
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200"
                title="Fecha de inicio"
              />
              <input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200"
                title="Fecha de fin"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={setHoy}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={setAyer}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Ayer
              </button>
              <button
                type="button"
                onClick={setSemanaActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Esta Semana
              </button>
              <button
                type="button"
                onClick={setQuincenaActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Quincena Actual
              </button>
              <button
                type="button"
                onClick={setMesActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Mes Actual
              </button>
            </div>
          </div>
        </header>

        {/* --- Farmacia Cards Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFarmacias.map((farm, idx) => (
            <div
              key={farm.id}
              className="flex flex-col"
            >
              <ResumeCardFarmacia
                nombre={farm.nombre}
                totalVentas={ventas[farm.id]?.totalVentas}
                totalBs={ventas[farm.id]?.totalBs}
                totalUsd={ventas[farm.id]?.totalUsd}
                efectivoUsd={ventas[farm.id]?.efectivoUsd}
                zelleUsd={ventas[farm.id]?.zelleUsd}
                faltantes={ventas[farm.id]?.faltantes}
                sobrantes={ventas[farm.id]?.sobrantes}
                totalGeneralSinRecargas={ventas[farm.id]?.totalGeneralSinRecargas}
                valesUsd={ventas[farm.id]?.valesUsd}
                top={idx < 3}
                pendienteVerificar={pendientesPorFarmacia[farm.id]}
                localidadId={farm.id}
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
              />
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors duration-300 shadow-md self-center w-full max-w-[200px]"
                onClick={() => setDetallesVisibles((prev) => ({ ...prev, [farm.id]: !prev[farm.id] }))}
              >
                {detallesVisibles[farm.id] ? "Ocultar Detalles" : "Ver Detalles Completos"}
                <i className={`ml-2 fas ${detallesVisibles[farm.id] ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              </button>
              {detallesVisibles[farm.id] && calcularDetalles(farm.id)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumenFarmaciasVentas;