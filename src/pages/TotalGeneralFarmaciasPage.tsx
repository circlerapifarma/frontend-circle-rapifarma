import React, { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import DashboardCard from "../components/DashboardCard";

// Reutilizamos las variantes de Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, type: "spring", stiffness: 80 },
  },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper para formatear moneda (considera moverlo a un archivo de utilidades)
const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "0.00";
  return amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper para formatear bolívares (considera moverlo a un archivo de utilidades)
const formatBs = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "0.00 Bs";
  return `${amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
};

const TotalGeneralFarmaciasPage: React.FC = () => {
  const [totalGeneral, setTotalGeneral] = useState<number | null>(null);
  const [totalSobrantes, setTotalSobrantes] = useState<number | null>(null);
  const [totalFaltantes, setTotalFaltantes] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para los totales específicos de métodos de pago
  const [totalEfectivoUsd, setTotalEfectivoUsd] = useState<number>(0);
  const [totalZelleUsd, setTotalZelleUsd] = useState<number>(0);
  const [totalPuntosVentaDebitoBs, setTotalPuntosVentaDebitoBs] = useState<number>(0);
  const [totalPuntosVentaCreditoBs, setTotalPuntosVentaCreditoBs] = useState<number>(0);
  const [totalPagomovilBs, setTotalPagomovilBs] = useState<number>(0);
  const [totalEfectivoBs, setTotalEfectivoBs] = useState<number>(0);

  // Estados para los nuevos totales
  const [totalGastos, setTotalGastos] = useState<number>(0);
  const [totalInventario, setTotalInventario] = useState<number>(0);
  const [totalCuentasPorPagar, setTotalCuentasPorPagar] = useState<number>(0);
  const [totalCuentasPagadas, setTotalCuentasPagadas] = useState<number>(0);
  const [totalCostoInventario, setTotalCostoInventario] = useState<number>(0);
  const [totalCostoInventarioRestante, setTotalCostoInventarioRestante] = useState<number>(0);

  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  useEffect(() => {
    // Por defecto, mes actual hasta el día de hoy
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setFechaInicio(firstDay.toISOString().slice(0, 10));
    setFechaFin(today.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    const fetchTotalGeneral = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/cuadres/all`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Filtrar solo los cuadres verificados dentro del rango de fechas
        const verified = data.filter((cuadre: any) => {
          if (cuadre.estado !== "verified" || !cuadre.dia) return false;
          const fecha = new Date(cuadre.dia);
          return (!fechaInicio || fecha >= new Date(fechaInicio)) && (!fechaFin || fecha <= new Date(fechaFin));
        });

        // Calcular totales principales
        const total = verified.reduce((acc: number, cuadre: any) => acc + (cuadre.totalGeneralUsd || 0), 0);
        const sobrantes = verified.reduce((acc: number, cuadre: any) => acc + (cuadre.sobranteUsd || 0), 0);
        const faltantes = verified.reduce((acc: number, cuadre: any) => acc + (cuadre.faltanteUsd || 0), 0);
        const costoInventarioTotal = verified.reduce((acc: number, cuadre: any) => acc + (cuadre.costoInventario || 0), 0);
        const costoInventarioRestante = total - costoInventarioTotal;

        setTotalGeneral(total);
        setTotalSobrantes(sobrantes);
        setTotalFaltantes(faltantes);
        setTotalCostoInventario(costoInventarioTotal);
        setTotalCostoInventarioRestante(costoInventarioRestante);

        // Calcular totales por método de pago
        setTotalEfectivoUsd(verified.reduce((acc: number, cuadre: any) => acc + (cuadre.efectivoUsd || 0), 0));
        setTotalZelleUsd(verified.reduce((acc: number, cuadre: any) => acc + (cuadre.zelleUsd || 0), 0));
        setTotalPuntosVentaDebitoBs(verified.reduce((acc: number, cuadre: any) => acc + (cuadre.puntosVenta ? cuadre.puntosVenta.reduce((sum: number, punto: any) => sum + (punto.puntoDebito || 0), 0) : 0), 0));
        setTotalPuntosVentaCreditoBs(verified.reduce((acc: number, cuadre: any) => acc + (cuadre.puntosVenta ? cuadre.puntosVenta.reduce((sum: number, punto: any) => sum + (punto.puntoCredito || 0), 0) : 0), 0));
        setTotalPagomovilBs(verified.reduce((acc: number, cuadre: any) => acc + (cuadre.pagomovilBs || 0), 0));
        setTotalEfectivoBs(verified.reduce((acc: number, cuadre: any) => acc + (cuadre.efectivoBs || 0), 0));

      } catch (err: any) {
        console.error("Error fetching total general:", err);
        setError(err.message || "Error al obtener el total general de las farmacias.");
      } finally {
        setLoading(false);
      }
    };

    if (fechaInicio && fechaFin) fetchTotalGeneral();
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    // Fetch nuevos totales generales
    const fetchResumenes = async () => {
      try {
        // Calcular rango del mes actual hasta el día de hoy dinámicamente
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fechaInicioMes = firstDayOfMonth.toISOString().split("T")[0];
        const fechaFinHoy = today.toISOString().split("T")[0];
        
        // Obtener token de autenticación
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        // GASTOS
        const resGastos = await fetch(`${API_BASE_URL}/gastos`, { headers });
        if (resGastos.ok) {
          const dataGastos = await resGastos.json();
          console.log("=== VentaTotal - Gastos ===");
          console.log("Gastos obtenidos del backend:", dataGastos.length, "total");
          console.log("Rango de fechas:", fechaInicioMes, "a", fechaFinHoy);
          
          // Mostrar todos los gastos verified para debug
          const gastosVerified = Array.isArray(dataGastos) 
            ? dataGastos.filter((g: any) => g.estado === 'verified')
            : [];
          console.log("=== VentaTotal - Debug Gastos ===");
          console.log("Gastos con estado 'verified':", gastosVerified.length);
          
          // Mostrar ejemplos de gastos verified con análisis de fechas
          const ejemplos = gastosVerified.slice(0, 10).map((g: any) => {
            let fechaGasto: Date | null = null;
            let enRango = false;
            try {
              if (typeof g.fecha === 'string' && g.fecha.includes('/')) {
                const [dia, mes, año] = g.fecha.split('/');
                fechaGasto = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
              } else {
                fechaGasto = new Date(g.fecha);
              }
              const fechaInicio = new Date(fechaInicioMes);
              const fechaFin = new Date(fechaFinHoy);
              fechaGasto.setHours(0, 0, 0, 0);
              fechaInicio.setHours(0, 0, 0, 0);
              fechaFin.setHours(0, 0, 0, 0);
              enRango = fechaGasto >= fechaInicio && fechaGasto <= fechaFin;
            } catch (e) {
              console.error("Error parseando fecha:", g.fecha, e);
            }
            return {
              id: g._id,
              fechaOriginal: g.fecha,
              fechaParseada: fechaGasto ? fechaGasto.toISOString().split('T')[0] : 'error',
              rangoEsperado: `${fechaInicioMes} a ${fechaFinHoy}`,
              enRango: enRango,
              localidad: g.localidad,
              monto: g.monto,
              divisa: g.divisa
            };
          });
          console.log("Ejemplos de gastos verified (primeros 10):", ejemplos);
          
          const gastosFiltrados = Array.isArray(dataGastos)
            ? dataGastos.filter((g: any) => {
                const esVerificado = g.estado === 'verified';
                
                // Comparar fechas correctamente - convertir a Date para comparación
                let enRango = false;
                if (g.fecha) {
                  try {
                    // Si la fecha viene en formato DD/MM/YYYY, convertirla
                    let fechaGasto: Date;
                    if (g.fecha.includes('/')) {
                      // Formato DD/MM/YYYY
                      const [dia, mes, año] = g.fecha.split('/');
                      fechaGasto = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
                    } else {
                      // Formato YYYY-MM-DD
                      fechaGasto = new Date(g.fecha);
                    }
                    
                    const fechaInicio = new Date(fechaInicioMes);
                    const fechaFin = new Date(fechaFinHoy);
                    
                    // Comparar solo la fecha (sin hora)
                    fechaGasto.setHours(0, 0, 0, 0);
                    fechaInicio.setHours(0, 0, 0, 0);
                    fechaFin.setHours(0, 0, 0, 0);
                    
                    enRango = fechaGasto >= fechaInicio && fechaGasto <= fechaFin;
                  } catch (e) {
                    console.error("Error al parsear fecha del gasto:", g.fecha, e);
                    enRango = false;
                  }
                }
                
                if (esVerificado && !enRango) {
                  console.log(`Gasto ${g._id} está verified pero fuera de rango:`, {
                    fecha: g.fecha,
                    rango: `${fechaInicioMes} a ${fechaFinHoy}`
                  });
                }
                return esVerificado && enRango;
              })
            : [];
          console.log("Gastos filtrados (verified y en rango):", gastosFiltrados.length);
          
          const totalGastosCalc = gastosFiltrados.reduce((acc: number, g: any) => {
            if (g.divisa === 'Bs' && g.tasa && Number(g.tasa) > 0) {
              return acc + (Number(g.monto || 0) / Number(g.tasa));
            }
            return acc + Number(g.monto || 0);
          }, 0);
          console.log("Total gastos calculado:", totalGastosCalc);
          setTotalGastos(Math.max(0, totalGastosCalc));
        } else {
          console.error("Error al obtener gastos:", resGastos.status, resGastos.statusText);
        }

        // INVENTARIO
        const resInventario = await fetch(`${API_BASE_URL}/inventarios`, { headers });
        if (resInventario.ok) {
          const dataInventario = await resInventario.json();
          // Solo inventarios activos y dentro de rango de fechas
          const inventarioFiltrado = Array.isArray(dataInventario)
            ? dataInventario.filter((inv: any) =>
                inv.estado === 'activo' &&
                (!inv.fecha || (new Date(inv.fecha) >= new Date(fechaInicioMes) && new Date(inv.fecha) <= new Date(fechaFinHoy)))
              )
            : [];
          // Sumar costo (USD), pero si algún inventario está en Bs y tiene tasa, convertirlo
          const totalInventarioCalc = inventarioFiltrado.reduce((acc: number, inv: any) => {
            if (inv.divisa === 'Bs' && inv.tasa && Number(inv.tasa) > 0) {
              return acc + (Number(inv.costo || 0) / Number(inv.tasa));
            }
            return acc + Number(inv.costo || 0);
          }, 0);
          setTotalInventario(Math.max(0, totalInventarioCalc));
        } else {
          console.error("Error al obtener inventarios:", resInventario.status);
        }

        // CUENTAS POR PAGAR
        if (token) {
          const resCuentas = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
            headers
          });
          const dataCuentas = await resCuentas.json();
          // Activas (sin filtrar por fecha)
          const cuentasActivas = Array.isArray(dataCuentas)
            ? dataCuentas.filter((c: any) => c.estatus === 'activa')
            : [];
          const totalCuentasActivas = cuentasActivas.reduce((acc: number, c: any) => acc + Number(c.montoUsd || 0), 0);
          setTotalCuentasPorPagar(Math.max(0, totalCuentasActivas));
          // Pagadas
          const cuentasPagadas = Array.isArray(dataCuentas)
            ? dataCuentas.filter((c: any) =>
                c.estatus === 'pagada' &&
                (!c.fechaEmision || (new Date(c.fechaEmision) >= new Date(fechaInicioMes) && new Date(c.fechaEmision) <= new Date(fechaFinHoy)))
              )
            : [];
          const totalCuentasPagadasCalc = cuentasPagadas.reduce((acc: number, c: any) => {
            if (c.divisa === 'USD' && typeof c.monto === 'number') {
              return acc + c.monto;
            }
            if (c.divisa === 'Bs' && typeof c.montoUsd === 'number') {
              return acc + c.montoUsd;
            }
            if (c.divisa === 'Bs' && typeof c.monto === 'number' && typeof c.tasa === 'number' && c.tasa > 0) {
              return acc + (c.monto / c.tasa);
            }
            return acc;
          }, 0);
          setTotalCuentasPagadas(Math.max(0, totalCuentasPagadasCalc));
        }
      } catch (e) {
        // No interrumpe la carga principal
      }
    };
    fetchResumenes();
    // Ejecutar cada minuto para actualizar si cambió el día o se verificaron nuevos gastos
    const interval = setInterval(fetchResumenes, 60000); // 60 segundos
    return () => clearInterval(interval);
  }, []); // Se ejecuta al montar y se actualiza periódicamente

  const currentMonthName = new Date().toLocaleString('es-VE', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full space-y-10">
        {/* Header Section */}
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-black leading-tight">
            📊 Resumen de Ventas de Farmacias
          </h1>
          <p className="mt-2 text-xl text-gray-700">
            Métricas consolidadas para el mes de <span className="font-semibold capitalize">{currentMonthName}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="border border-blue-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                max={fechaFin}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="border border-blue-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                min={fechaInicio}
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-lg border border-blue-200">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            <p className="mt-4 text-xl text-gray-700 font-medium">Cargando datos del mes...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl shadow-lg border border-red-200">
            <AlertTriangle className="h-16 w-16 text-red-500" />
            <p className="mt-4 text-xl text-red-700 font-medium text-center">¡Error al cargar los datos!</p>
            <p className="mt-2 text-red-600 text-base text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Categoría: Ventas */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">Ventas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div variants={cardVariants} className="rounded-2xl border border-black bg-[#f5f5f5] p-8 flex flex-col items-center text-center shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-[#1a202c] flex items-center drop-shadow-sm"><span className="text-green-600 mr-2 text-5xl">$</span>{formatCurrency(totalGeneral)}</span>
                  <span className="text-xl text-gray-700 mt-4 font-semibold tracking-wide">Ventas Totales</span>
                </motion.div>
                <motion.div variants={cardVariants} className="rounded-2xl border border-black bg-[#e0f7fa] p-8 flex flex-col items-center text-center shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-blue-950 flex items-center drop-shadow-sm"><span className="text-green-600 mr-2 text-5xl">$</span>{formatCurrency(totalSobrantes)}</span>
                  <span className="text-xl text-gray-700 mt-4 font-semibold tracking-wide">Sobrantes</span>
                </motion.div>
                <motion.div variants={cardVariants} className="rounded-2xl border border-black bg-[#ffebee] p-8 flex flex-col items-center text-center shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-[#b71c1c] flex items-center drop-shadow-sm"><span className="text-green-600 mr-2 text-5xl">$</span>{formatCurrency(totalFaltantes)}</span>
                  <span className="text-xl text-gray-700 mt-4 font-semibold tracking-wide">Faltantes</span>
                </motion.div>
              </div>
            </div>

            {/* Categoría: Métodos de Pago */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">Métodos de Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-black bg-white p-8 flex flex-col gap-4 shadow-lg transition-shadow duration-300">
                  <span className="text-xl font-semibold text-gray-700 mb-4 tracking-wide">USD</span>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>Efectivo</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">$</span>{formatCurrency(totalEfectivoUsd)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>Zelle</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">$</span>{formatCurrency(totalZelleUsd)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-black bg-white p-8 flex flex-col gap-4 shadow-lg transition-shadow duration-300">
                  <span className="text-xl font-semibold text-gray-700 mb-4 tracking-wide">Bolívares</span>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>P. Venta (Débito)</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totalPuntosVentaDebitoBs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>P. Venta (Crédito)</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totalPuntosVentaCreditoBs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>Pago Móvil</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totalPagomovilBs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>Efectivo</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totalEfectivoBs)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Categoría: Resúmenes */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">Resúmenes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalGastos)}</span>}
                  subtitle="Gastos"
                  badge={<span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">Sistema</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,20 20,10 40,14 60,6 80,12 100,4" stroke="#22c55e" strokeWidth="2" fill="none"/></svg>}
                />
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalInventario)}</span>}
                  subtitle="Inventario (USD)"
                  badge={<span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Inventario</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,18 20,12 40,16 60,8 80,10 100,6" stroke="#2563eb" strokeWidth="2" fill="none"/></svg>}
                />
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalCuentasPorPagar + totalCuentasPagadas)}</span>}
                  subtitle="Cuentas por Pagar y Pagadas"
                  badge={<span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Cuentas</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,22 20,16 40,20 60,10 80,14 100,8" stroke="#f59e42" strokeWidth="2" fill="none"/></svg>}
                />
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalCostoInventario)}</span>}
                  subtitle="Inventario Costo Venta"
                  badge={<span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">Inventario</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,16 20,8 40,12 60,6 80,10 100,4" stroke="#a21caf" strokeWidth="2" fill="none"/></svg>}
                />
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalCostoInventarioRestante)}</span>}
                  subtitle="Utilidad (Venta - Costo Inventario)"
                  badge={<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Utilidad</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,20 20,14 40,18 60,10 80,12 100,6" stroke="#22c55e" strokeWidth="2" fill="none"/></svg>}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TotalGeneralFarmaciasPage;