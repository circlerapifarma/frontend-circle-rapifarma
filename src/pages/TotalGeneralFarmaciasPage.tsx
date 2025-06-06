import React, { useEffect, useState } from "react";
import { Loader2, AlertTriangle, DollarSign, ArrowUp, ArrowDown, Warehouse, FileMinus2, HandCoins, CheckCircle2 } from "lucide-react"; // Añadimos ArrowUp y ArrowDown
import { motion } from "framer-motion";

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
  if (amount === null || amount === undefined) return "$0.00";
  return `$${amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  useEffect(() => {
    // Por defecto, mes actual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFechaInicio(firstDay.toISOString().slice(0, 10));
    setFechaFin(lastDay.toISOString().slice(0, 10));
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

        setTotalGeneral(total);
        setTotalSobrantes(sobrantes);
        setTotalFaltantes(faltantes);

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
        // GASTOS
        const resGastos = await fetch(`${API_BASE_URL}/gastos`);
        const dataGastos = await resGastos.json();
        const gastosFiltrados = Array.isArray(dataGastos)
          ? dataGastos.filter((g: any) =>
              g.estado === 'verified' &&
              (!fechaInicio || new Date(g.fecha) >= new Date(fechaInicio)) &&
              (!fechaFin || new Date(g.fecha) <= new Date(fechaFin))
            )
          : [];
        const totalGastosCalc = gastosFiltrados.reduce((acc: number, g: any) => {
          if (g.divisa === 'Bs' && g.tasa && Number(g.tasa) > 0) {
            return acc + (Number(g.monto || 0) / Number(g.tasa));
          }
          return acc + Number(g.monto || 0);
        }, 0);
        setTotalGastos(Math.max(0, totalGastosCalc));

        // INVENTARIO
        const resInventario = await fetch(`${API_BASE_URL}/inventarios`);
        const dataInventario = await resInventario.json();
        // Solo inventarios activos y dentro de rango de fechas
        const inventarioFiltrado = Array.isArray(dataInventario)
          ? dataInventario.filter((inv: any) =>
              inv.estado === 'activo' &&
              (!fechaInicio || new Date(inv.fecha) >= new Date(fechaInicio)) &&
              (!fechaFin || new Date(inv.fecha) <= new Date(fechaFin))
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

        // CUENTAS POR PAGAR
        const token = localStorage.getItem("token");
        if (token) {
          const resCuentas = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const dataCuentas = await resCuentas.json();
          // Activas
          const cuentasActivas = Array.isArray(dataCuentas)
            ? dataCuentas.filter((c: any) =>
                c.estatus === 'activa' &&
                (!fechaInicio || new Date(c.fechaEmision) >= new Date(fechaInicio)) &&
                (!fechaFin || new Date(c.fechaEmision) <= new Date(fechaFin))
              )
            : [];
          const totalCuentasActivas = cuentasActivas.reduce((acc: number, c: any) => acc + Number(c.montoUsd || 0), 0);
          setTotalCuentasPorPagar(Math.max(0, totalCuentasActivas));
          // Pagadas
          const cuentasPagadas = Array.isArray(dataCuentas)
            ? dataCuentas.filter((c: any) =>
                c.estatus === 'pagada' &&
                (!fechaInicio || new Date(c.fechaEmision) >= new Date(fechaInicio)) &&
                (!fechaFin || new Date(c.fechaEmision) <= new Date(fechaFin))
              )
            : [];
          const totalCuentasPagadasCalc = cuentasPagadas.reduce((acc: number, c: any) => acc + Number(c.montoUsd || 0), 0);
          setTotalCuentasPagadas(Math.max(0, totalCuentasPagadasCalc));
        }
      } catch (e) {
        // No interrumpe la carga principal
      }
    };
    if (fechaInicio && fechaFin) fetchResumenes();
  }, [fechaInicio, fechaFin]);

  const currentMonthName = new Date().toLocaleString('es-VE', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full space-y-10">
        {/* Header Section */}
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 leading-tight">
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
            {/* Tarjeta: Total General (USD) */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-blue-300 bg-white p-8 space-y-4 shadow-xl flex flex-col items-center text-center transition-all duration-300"
            >
              <div className="bg-blue-100 rounded-full p-4">
                <DollarSign className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Ventas Totales (USD)</h2>
              <p className="text-5xl font-extrabold text-blue-700">
                {formatCurrency(totalGeneral)}
              </p>
              <p className="text-sm text-gray-500">Monto total de ventas verificadas.</p>
            </motion.div>

            {/* Tarjeta: Sobrantes */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-green-300 bg-white p-8 space-y-4 shadow-xl flex flex-col items-center text-center transition-all duration-300"
            >
              <div className="bg-green-100 rounded-full p-4">
                <ArrowUp className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Total Sobrantes (USD)</h2>
              <p className="text-5xl font-extrabold text-green-700">
                {formatCurrency(totalSobrantes)}
              </p>
              <p className="text-sm text-gray-500">Exceso en cuadres verificados.</p>
            </motion.div>

            {/* Tarjeta: Faltantes */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-red-300 bg-white p-8 space-y-4 shadow-xl flex flex-col items-center text-center transition-all duration-300"
            >
              <div className="bg-red-100 rounded-full p-4">
                <ArrowDown className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Total Faltantes (USD)</h2>
              <p className="text-5xl font-extrabold text-red-700">
                {formatCurrency(totalFaltantes)}
              </p>
              <p className="text-sm text-gray-500">Déficit en cuadres verificados.</p>
            </motion.div>

            {/* Tarjeta: Desglose de Métodos de Pago USD */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="md:col-span-1 lg:col-span-2 rounded-2xl border-2 border-purple-300 bg-white p-8 space-y-4 shadow-xl flex flex-col justify-center items-center text-center transition-all duration-300"
            >
              <div className="bg-purple-100 rounded-full p-4">
                <DollarSign className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Desglose de USD</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-md font-semibold text-gray-700">Efectivo USD</p>
                  <p className="text-3xl font-extrabold text-purple-800">{formatCurrency(totalEfectivoUsd)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-md font-semibold text-gray-700">Zelle USD</p>
                  <p className="text-3xl font-extrabold text-purple-800">{formatCurrency(totalZelleUsd)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Distribución de ingresos en dólares.</p>
            </motion.div>

            {/* Tarjeta: Desglose de Métodos de Pago BS */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-orange-300 bg-white p-8 space-y-4 shadow-xl flex flex-col justify-center items-center text-center transition-all duration-300"
            >
              <div className="bg-orange-100 rounded-full p-4">
                <DollarSign className="w-10 h-10 text-orange-600" /> {/* Reutilizando DollarSign por ahora */}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Desglose de Bs</h2>
              <div className="grid grid-cols-1 gap-4 w-full">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-md font-semibold text-gray-700">Puntos de Venta (Débito)</p>
                  <p className="text-2xl font-extrabold text-orange-800">{formatBs(totalPuntosVentaDebitoBs)}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-md font-semibold text-gray-700">Puntos de Venta (Crédito)</p>
                  <p className="text-2xl font-extrabold text-orange-800">{formatBs(totalPuntosVentaCreditoBs)}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-md font-semibold text-gray-700">Pago Móvil</p>
                  <p className="text-2xl font-extrabold text-orange-800">{formatBs(totalPagomovilBs)}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-md font-semibold text-gray-700">Efectivo Bs</p>
                  <p className="text-2xl font-extrabold text-orange-800">{formatBs(totalEfectivoBs)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Distribución de ingresos en bolívares.</p>
            </motion.div>

            {/* NUEVAS TARJETAS DE RESUMEN */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-red-300 bg-white p-8 space-y-4 shadow-xl flex flex-col items-center text-center transition-all duration-300"
            >
              <div className="bg-red-100 rounded-full p-4">
                <FileMinus2 className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Total Gastos (USD)</h2>
              <p className="text-5xl font-extrabold text-red-700">{formatCurrency(totalGastos)}</p>
              <p className="text-sm text-gray-500">Suma de todos los gastos verificados (reconvertidos a USD).</p>
            </motion.div>
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-blue-300 bg-white p-8 space-y-4 shadow-xl flex flex-col items-center text-center transition-all duration-300"
            >
              <div className="bg-blue-100 rounded-full p-4">
                <Warehouse className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Total Inventario (USD)</h2>
              <p className="text-5xl font-extrabold text-blue-700">{formatCurrency(totalInventario)}</p>
              <p className="text-sm text-gray-500">Suma del valor de inventario en USD.</p>
            </motion.div>
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-orange-300 bg-white p-8 space-y-4 shadow-xl flex flex-col items-center text-center transition-all duration-300"
            >
              <div className="bg-orange-100 rounded-full p-4">
                <HandCoins className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Cuentas por Pagar (USD)</h2>
              <p className="text-5xl font-extrabold text-orange-700">{formatCurrency(totalCuentasPorPagar)}</p>
              <p className="text-sm text-gray-500">Total de cuentas por pagar activas (USD).</p>
            </motion.div>
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border-2 border-green-300 bg-white p-8 space-y-4 shadow-xl flex flex-col items-center text-center transition-all duration-300"
            >
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Cuentas Pagadas (USD)</h2>
              <p className="text-5xl font-extrabold text-green-700">{formatCurrency(totalCuentasPagadas)}</p>
              <p className="text-sm text-gray-500">Total de cuentas por pagar pagadas (USD).</p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TotalGeneralFarmaciasPage;