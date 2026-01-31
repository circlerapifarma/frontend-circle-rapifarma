import React, { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
// import DashboardCard from "../components/DashboardCard";
import { useCuadresDetallados } from "@/hooks/useCuadresV2";

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

const FARMACIAS_EJEMPLO = [
  { value: "", label: "Todas las farmacias" },
  { label: "Santa Rosa", value: "10" },
  { label: "Santa Monica", value: "11" },
  { label: "Santa Elena", value: "01" },
  { label: "Sur America", value: "02" },
  { label: "Rapifarma", value: "03" },
  { label: "San Carlos", value: "04" },
  { label: "Las Alicias", value: "05" },
  { label: "San Martin", value: "06" },
  { label: "Milagro Norte", value: "07" },
  { label: "Virginia", value: "08" },
  { label: "Santo Tomas", value: "09" }
]

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

  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");


  const {
    cuadres,
    isLoading: cuadresLoading,
    isError: cuadresError,
    error: cuadresErrorMsg,
    refresh
  } = useCuadresDetallados({
    farmacia: farmaciaSeleccionada || undefined,
    fechaInicio,
    fechaFin,
    estado: "verified" // Fijo como pediste
  });
  console.log("Cuadres obtenidos:", cuadres);
  const totals = useMemo(() => {
    if (!cuadres.length) return {
      totalGeneral: 0,
      totalSobrantes: 0,
      totalFaltantes: 0,
      totalEfectivoUsd: 0,
      totalZelleUsd: 0,
      totalPuntosVentaDebitoBs: 0,
      totalPuntosVentaCreditoBs: 0,
      totalPagomovilBs: 0,
      totalEfectivoBs: 0,
    };

    return {
      totalGeneral: cuadres.reduce((acc, c) => acc + c.totalGeneralUsd, 0),
      totalSobrantes: cuadres.reduce((acc, c) => acc + c.sobranteUsd, 0),
      totalFaltantes: cuadres.reduce((acc, c) => acc + c.faltanteUsd, 0),
      totalEfectivoUsd: cuadres.reduce((acc, c) => acc + c.efectivoUsd, 0),
      totalZelleUsd: cuadres.reduce((acc, c) => acc + c.zelleUsd, 0),
      totalPuntosVentaDebitoBs: cuadres.reduce((acc, c) =>
        acc + c.puntosVenta.reduce((sum, pv) => sum + pv.puntoDebito, 0), 0
      ),
      totalPuntosVentaCreditoBs: cuadres.reduce((acc, c) =>
        acc + c.puntosVenta.reduce((sum, pv) => sum + pv.puntoCredito, 0), 0
      ),
      totalPagomovilBs: cuadres.reduce((acc, c) => acc + c.pagomovilBs, 0),
      totalEfectivoBs: cuadres.reduce((acc, c) => acc + c.efectivoBs, 0),
    };
  }, [cuadres]);


  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setFechaInicio(firstDay.toISOString().slice(0, 10));
    setFechaFin(today.toISOString().slice(0, 10));
  }, []);

  const currentMonthName = new Date().toLocaleString('es-VE', { month: 'long', year: 'numeric' });
  const filtrosActivos = farmaciaSeleccionada || fechaInicio !== fechaFin;

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

          {/* Filtros mejorados */}
          <div className="flex flex-col lg:flex-row gap-4 justify-center items-center mt-6 p-4 bg-blue-50 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farmacia</label>
              <select
                value={farmaciaSeleccionada}
                onChange={(e) => setFarmaciaSeleccionada(e.target.value)}
                className="border border-blue-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
              >
                {FARMACIAS_EJEMPLO.map((farmacia) => (
                  <option key={farmacia.value} value={farmacia.value}>
                    {farmacia.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border border-blue-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                max={fechaFin}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="border border-blue-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                min={fechaInicio}
              />
            </div>
            <button
              onClick={() => refresh()}
              disabled={cuadresLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {cuadresLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "🔄"
              )}
              Actualizar
            </button>
          </div>

          {/* Indicador de filtros */}
          {filtrosActivos && (
            <div className="mt-2 text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full max-w-max mx-auto">
              {farmaciaSeleccionada ? `Farmacia: ${FARMACIAS_EJEMPLO.find(f => f.value === farmaciaSeleccionada)?.label}` : 'Todas las farmacias'} •
              {fechaInicio} - {fechaFin} •
              {cuadres.length} cuadres verificados
            </div>
          )}
        </header>

        {cuadresLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-lg border border-blue-200">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            <p className="mt-4 text-xl text-gray-700 font-medium">Cargando cuadres verificados...</p>
          </div>
        ) : cuadresError ? (
          <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl shadow-lg border border-red-200">
            <AlertTriangle className="h-16 w-16 text-red-500" />
            <p className="mt-4 text-xl text-red-700 font-medium text-center">¡Error al cargar los cuadres!</p>
            <p className="mt-2 text-red-600 text-base text-center">{cuadresErrorMsg?.message || 'Error desconocido'}</p>
            <button
              onClick={() => refresh()}
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
            {/* Categoría: Ventas - USANDO DATOS DEL HOOK */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">Ventas (Verificados)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div variants={cardVariants} className="rounded-2xl border border-black bg-[#f5f5f5] p-8 flex flex-col items-center text-center shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-[#1a202c] flex items-center drop-shadow-sm">
                    <span className="text-green-600 mr-2 text-5xl">$</span>{formatCurrency(totals.totalGeneral)}
                  </span>
                  <span className="text-xl text-gray-700 mt-4 font-semibold tracking-wide">Ventas Totales</span>
                </motion.div>
                <motion.div variants={cardVariants} className="rounded-2xl border border-black bg-[#e0f7fa] p-8 flex flex-col items-center text-center shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-blue-950 flex items-center drop-shadow-sm">
                    <span className="text-green-600 mr-2 text-5xl">$</span>{formatCurrency(totals.totalSobrantes)}
                  </span>
                  <span className="text-xl text-gray-700 mt-4 font-semibold tracking-wide">Sobrantes</span>
                </motion.div>
                <motion.div variants={cardVariants} className="rounded-2xl border border-black bg-[#ffebee] p-8 flex flex-col items-center text-center shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-[#b71c1c] flex items-center drop-shadow-sm">
                    <span className="text-green-600 mr-2 text-5xl">$</span>{formatCurrency(totals.totalFaltantes)}
                  </span>
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
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">$</span>{formatCurrency(totals.totalEfectivoUsd)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>Zelle</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">$</span>{formatCurrency(totals.totalZelleUsd)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-black bg-white p-8 flex flex-col gap-4 shadow-lg transition-shadow duration-300">
                  <span className="text-xl font-semibold text-gray-700 mb-4 tracking-wide">Bolívares</span>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>P. Venta (Débito)</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totals.totalPuntosVentaDebitoBs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>P. Venta (Crédito)</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totals.totalPuntosVentaCreditoBs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>Pago Móvil</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totals.totalPagomovilBs)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 text-lg font-medium">
                    <span>Efectivo</span>
                    <span className="font-extrabold flex items-center text-2xl"><span className="text-green-600 mr-2 text-2xl">Bs</span>{formatBs(totals.totalEfectivoBs)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Categoría: Resúmenes */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-1">Resúmenes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(Gastos)}</span>}
                  subtitle="Gastos"
                  badge={<span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">Sistema</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,20 20,10 40,14 60,6 80,12 100,4" stroke="#22c55e" strokeWidth="2" fill="none" /></svg>}
                />
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totals.totalInventario)}</span>}
                  subtitle="Inventario (USD)"
                  badge={<span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Inventario</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,18 20,12 40,16 60,8 80,10 100,6" stroke="#2563eb" strokeWidth="2" fill="none" /></svg>}
                /> */}
                {/* <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalCuentasPorPagar + totalCuentasPagadas)}</span>}
                  subtitle="Cuentas por Pagar y Pagadas"
                  badge={<span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Cuentas</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,22 20,16 40,20 60,10 80,14 100,8" stroke="#f59e42" strokeWidth="2" fill="none" /></svg>}
                />
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalCostoInventario)}</span>}
                  subtitle="Inventario Costo Venta"
                  badge={<span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">Inventario</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,16 20,8 40,12 60,6 80,10 100,4" stroke="#a21caf" strokeWidth="2" fill="none" /></svg>}
                />
                <DashboardCard
                  title="Mes a la fecha"
                  value={<span className="flex items-center"><span className="text-green-600 mr-2 text-3xl">$</span>{formatCurrency(totalCostoInventarioRestante)}</span>}
                  subtitle="Utilidad (Venta - Costo Inventario)"
                  badge={<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Utilidad</span>}
                  trendSvg={<svg viewBox="0 0 100 24" fill="none" className="w-full h-full"><polyline points="0,20 20,14 40,18 60,10 80,12 100,6" stroke="#22c55e" strokeWidth="2" fill="none" /></svg>}
                /> */}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TotalGeneralFarmaciasPage;