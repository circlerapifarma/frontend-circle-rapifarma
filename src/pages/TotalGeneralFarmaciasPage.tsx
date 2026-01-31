import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, BarChart3, Calendar, Building2, DollarSign, TrendingDown, Landmark, Wallet, CreditCard, TrendingUp, Receipt, PlusCircle, Banknote, ArrowRightLeft, MinusCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCuadresDetallados } from "@/hooks/useCuadresV2";
import { useGastosPorEstado } from "@/hooks/useGastosPorEstado";
import { useCuentasPorPagar } from "@/hooks/useCuentasPorPagar"; // ✅ NUEVO
import { PieChart } from "recharts";

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
];

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "0.00";
  return amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatBs = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "0.00 Bs";
  return `${amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
};

const TotalGeneralFarmaciasPage: React.FC = () => {
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState<boolean>(true);
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");

  // 🎯 Hook de CUADRES
  const {
    cuadres,
    isLoading: cuadresLoading,
    refresh: refreshCuadres
  } = useCuadresDetallados({
    farmacia: farmaciaSeleccionada || undefined,
    fechaInicio,
    fechaFin,
    estado: "verified"
  });

  // 🎯 Hook de GASTOS
  const {
    totalGastosUsd,
    isLoading: gastosLoading,
    refresh: refreshGastos
  } = useGastosPorEstado({
    estado: 'verified',
    fechaInicio,
    fechaFin,
    localidad: farmaciaSeleccionada || undefined
  });

  // 🎯 Hook de CUENTAS POR PAGAR (requiere fechas obligatorias)
  const cuentasHook = useCuentasPorPagar(
    fechaInicio && fechaFin ? {
      startDate: fechaInicio,
      endDate: fechaFin,
      farmacia: farmaciaSeleccionada || undefined,
    } : null
  );

  const totals = useMemo(() => {
    if (!cuadres.length) return {
      totalGeneral: 0, totalSobrantes: 0, totalFaltantes: 0,
      totalEfectivoUsd: 0, totalZelleUsd: 0,
      totalPuntosVentaDebitoBs: 0, totalPuntosVentaCreditoBs: 0,
      totalPagomovilBs: 0, totalEfectivoBs: 0,
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
  const loading = cuadresLoading || gastosLoading || cuentasHook.isLoading;

  const handleRefresh = () => {
    refreshCuadres();
    refreshGastos();
    cuentasHook.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 py-8 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl w-full space-y-6">

        {/* Header & Filtros */}
        <header className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                <BarChart3 className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Detalle de Operaciones</h1>
                <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> <span className="capitalize text-blue-600 font-bold">{currentMonthName}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <div className="relative flex items-center">
                <Building2 className="absolute left-3 w-4 h-4 text-slate-400 z-10" />
                <select
                  value={farmaciaSeleccionada}
                  onChange={(e) => setFarmaciaSeleccionada(e.target.value)}
                  className="pl-9 pr-8 py-2.5 bg-white border-none rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 appearance-none min-w-[180px]"
                >
                  {FARMACIAS_EJEMPLO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="px-3 py-2.5 bg-white border-none rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500" />
                <span className="text-slate-400 font-bold">/</span>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="px-3 py-2.5 bg-white border-none rounded-xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleRefresh} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-95 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Botón Estadísticas y Badge de Estado */}
        <div className="flex justify-between items-center px-2">
          <button
            onClick={() => setMostrarEstadisticas(!mostrarEstadisticas)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold hover:shadow-md transition-all group"
          >
            <PieChart className={`w-5 h-5 transition-transform ${mostrarEstadisticas ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
            Mostrar Estadísticas y Balance
          </button>

          {filtrosActivos && (
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {cuadres.length} Cuadres Procesados
              </span>
            </div>
          )}
        </div>

        {/* SECCIÓN ESTADÍSTICAS (Balance entre meses) */}
        <AnimatePresence>
          {mostrarEstadisticas && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg">
                <div className="flex justify-between opacity-80 mb-2 font-bold text-xs uppercase tracking-wider">Balance Ingresos/Egresos</div>
                <div className="text-3xl font-black">${formatCurrency(totals.totalGeneral - totalGastosUsd)}</div>
                <p className="text-[10px] mt-2 opacity-70">Utilidad operativa bruta en el periodo seleccionado</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
                <div className="flex justify-between text-slate-400 mb-2 font-bold text-xs uppercase tracking-wider">Ratio de Diferencias</div>
                <div className="text-3xl font-black text-slate-900">
                  {((Math.abs(totals.totalSobrantes - totals.totalFaltantes) / totals.totalGeneral) * 100).toFixed(2)}%
                </div>
                <p className="text-[10px] mt-2 text-slate-500 font-medium italic">Impacto de faltantes/sobrantes sobre venta</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
                <div className="flex justify-between text-slate-400 mb-2 font-bold text-xs uppercase tracking-wider">Deuda Pendiente</div>
                <div className="text-3xl font-black text-orange-600">${formatCurrency(cuentasHook.totalActivasUsd)}</div>
                <p className="text-[10px] mt-2 text-slate-500 font-medium italic">Total de {cuentasHook.cuentasActivas.length} facturas activas</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRID PRINCIPAL BENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* 1. VENTAS, SOBRANTES Y FALTANTES (Cuerpo Principal) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign className="w-16 h-16" /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ventas Totales</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">${formatCurrency(totals.totalGeneral)}</h3>
                <div className="mt-4 flex items-center gap-1 text-green-600 text-[10px] font-bold">
                  <PlusCircle className="w-3 h-3" /> MONTO VERIFICADO
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 shadow-sm">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Sobrantes</p>
                <h3 className="text-3xl font-black text-blue-900 mt-1">${formatCurrency(totals.totalSobrantes)}</h3>
                <div className="mt-4 flex items-center gap-1 text-blue-600 text-[10px] font-bold">
                  <TrendingUp className="w-3 h-3" /> EXCESO EN CAJA
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 shadow-sm">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Faltantes</p>
                <h3 className="text-3xl font-black text-red-900 mt-1">${formatCurrency(totals.totalFaltantes)}</h3>
                <div className="mt-4 flex items-center gap-1 text-red-600 text-[10px] font-bold">
                  <TrendingDown className="w-3 h-3" /> DÉFICIT EN CAJA
                </div>
              </div>
            </div>

            {/* 2. DESGLOSE DETALLADO DE MÉTODOS DE PAGO */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl text-white"><ArrowRightLeft className="w-5 h-5" /></div>
                <h3 className="font-bold text-slate-800 tracking-tight">Detalle de Ingresos por Método</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Columna USD */}
                <div className="p-6 border-r border-slate-50 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Divisas (USD)</span>
                  </div>
                  <div className="flex justify-between items-center group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <Banknote className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">Efectivo USD</span>
                    </div>
                    <span className="font-black text-slate-900">${formatCurrency(totals.totalEfectivoUsd)}</span>
                  </div>
                  <div className="flex justify-between items-center group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <Landmark className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">Zelle</span>
                    </div>
                    <span className="font-black text-slate-900">${formatCurrency(totals.totalZelleUsd)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Subtotal USD</span>
                    <span className="text-xl font-black text-blue-600">${formatCurrency(totals.totalEfectivoUsd + totals.totalZelleUsd)}</span>
                  </div>
                </div>

                {/* Columna Bolívares */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Moneda Nacional (VES)</span>
                  </div>
                  <div className="flex justify-between items-center group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">P. Venta Débito</span>
                    </div>
                    <span className="font-black text-slate-900">Bs {formatBs(totals.totalPuntosVentaDebitoBs)}</span>
                  </div>
                  <div className="flex justify-between items-center group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-600">P. Venta Crédito</span>
                    </div>
                    <span className="font-black text-slate-900">Bs {formatBs(totals.totalPuntosVentaCreditoBs)}</span>
                  </div>
                  <div className="flex justify-between items-center group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">Pago Móvil</span>
                    </div>
                    <span className="font-black text-slate-900">Bs {formatBs(totals.totalPagomovilBs)}</span>
                  </div>
                  <div className="flex justify-between items-center group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <Banknote className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">Efectivo Bs</span>
                    </div>
                    <span className="font-black text-slate-900">Bs {formatBs(totals.totalEfectivoBs)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Subtotal VES</span>
                    <span className="text-xl font-black text-slate-900">Bs {formatBs(totals.totalPuntosVentaDebitoBs + totals.totalPuntosVentaCreditoBs + totals.totalPagomovilBs + totals.totalEfectivoBs)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. COLUMNA LATERAL (GASTOS Y CUENTAS POR PAGAR) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Gastos */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm border-l-4 border-l-red-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-50 rounded-xl text-red-600"><MinusCircle className="w-5 h-5" /></div>
                <h3 className="font-bold text-slate-800 tracking-tight">Gastos Verificados</h3>
              </div>
              <div className="text-3xl font-black text-slate-900">${formatCurrency(totalGastosUsd)}</div>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Salidas netas en USD</p>
            </div>

            {/* Cuentas por Pagar (Visualizado como Cartera) */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:rotate-12 transition-transform duration-500"><Receipt className="w-40 h-40" /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cartera Cuentas por Pagar</p>
              <div className="text-4xl font-black mt-2 mb-8">${formatCurrency(cuentasHook.totalActivasUsd + cuentasHook.totalPagadasUsd)}</div>

              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">Pendientes de Pago</span>
                    <span className="text-xs font-bold text-slate-500">{cuentasHook.cuentasActivas.length} documentos</span>
                  </div>
                  <div className="text-2xl font-black">${formatCurrency(cuentasHook.totalActivasUsd)}</div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-tighter">Histórico Pagado</span>
                  </div>
                  <div className="text-2xl font-black">${formatCurrency(cuentasHook.totalPagadasUsd)}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TotalGeneralFarmaciasPage;
