import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, BarChart3, Calendar, Building2, TrendingDown, Landmark, Wallet, CreditCard, TrendingUp, Receipt, Banknote, ArrowRightLeft, MinusCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCuadresDetallados } from "@/hooks/useCuadresV2";
import { useGastosPorEstado } from "@/hooks/useGastosPorEstado";
import { useCuentasPorPagar } from "@/hooks/useCuentasPorPagar"; // ✅ NUEVO
import ExportarTodoExcel from "@/components/stats/Report";

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
      totalPuntosVentaDebitoUsd: 0, totalPuntosVentaCreditoUsd: 0,
      totalPagomovilUsd: 0, totalEfectivoUsdFromBs: 0,
      totalInventario: 0
    };

    return {
      totalGeneral: cuadres.reduce((acc, c) => acc + c.totalGeneralUsd, 0),
      totalInventario: cuadres.reduce((acc, c) => acc + (c.costoInventario / c.tasa), 0),
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
      totalPuntosVentaDebitoUsd: cuadres.reduce((acc, c) =>
        acc + c.puntosVenta.reduce((sum, pv) => sum + (pv.puntoDebito / c.tasa), 0), 0
      ),
      totalPuntosVentaCreditoUsd: cuadres.reduce((acc, c) =>
        acc + c.puntosVenta.reduce((sum, pv) => sum + (pv.puntoCredito / c.tasa), 0), 0
      ),
      totalPagomovilUsd: cuadres.reduce((acc, c) => acc + (c.pagomovilBs / c.tasa), 0),
      totalEfectivoUsdFromBs: cuadres.reduce((acc, c) => acc + (c.efectivoBs / c.tasa), 0),
      totalDevolucionesUsd: cuadres.reduce((acc, c) => acc + (c.devolucionesBs / c.tasa), 0),
      sumaTotalGeneralManual: cuadres.reduce((acc, c) => {
        const totalManual = c.efectivoUsd + c.zelleUsd +
          c.puntosVenta.reduce((sum, pv) => sum + (pv.puntoDebito / c.tasa) + (pv.puntoCredito / c.tasa), 0) + (c.valesUsd || 0) + ((c.valesBs || 0) / c.tasa) +
          (c.pagomovilBs / c.tasa) + (c.efectivoBs / c.tasa);
        return acc + totalManual;
      }, 0)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 py-8 sm:px-6 lg:px-8 font-sans relative animate__animated animate__fadeIn">
      <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:rotate-12 transition-transform duration-500"><Building2 className="w-4 h-4" /></div>
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
        {/* Resumen Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2">
            {/* Sección de Deducciones (Costos y Gastos) */}
            <div className="relative overflow-hidden rounded-3xl p-8 border shadow-2xl ">
              {/* Fondo decorativo sutil */}
              <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <Wallet className="w-48 h-48" />
              </div>

              <div className="relative z-10 space-y-6">
                {/* 1. VENTA BRUTA */}
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">
                    Venta Bruta
                  </p>
                  <h2 className="text-4xl font-bold ">
                    ${formatCurrency(totals.sumaTotalGeneralManual)}
                  </h2>
                </div>

                {/* 2. COSTO DE VENTA */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">
                      Costo de Venta
                    </p>
                    <MinusCircle className="w-3 h-3 text-emerald-500/50" />
                  </div>
                  <h2 className="text-4xl font-bold ">
                    ${formatCurrency(totals.totalInventario)}
                  </h2>
                </div>

                {/* 3. VENTAS - COSTO (SUBTOTAL) */}
                <div className="flex flex-col pt-4 border-t border-white/10">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">
                    Venta bruta - Costo de Venta
                  </p>
                  <h2 className="text-4xl font-bold ">
                    ${formatCurrency(totals.totalGeneral - (totals.totalInventario || 0))}
                  </h2>
                </div>

                {/* 4. GASTOS VERIFICADOS */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">
                      Gastos Verificados
                    </p>
                    <MinusCircle className="w-3 h-3 text-emerald-500/50" />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-bold ">
                      ${formatCurrency(totalGastosUsd)} 
                    </h2>
                    <span className="text-[10px] font-bold text-emerald-500/60 bg-emerald-400/10 px-2 py-0.5 rounded">
                      {(totalGastosUsd / totals.totalGeneral * 100).toFixed(1)}% IMPACTO
                    </span>
                  </div>
                </div>

                {/* 5. UTILIDAD NETA (RESULTADO FINAL) */}
                <div className="flex flex-col pt-6 border-t-2 border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
                      Utilidad Neta
                    </p>
                  </div>
                  <h2 className="text-6xl font-black tracking-tighter">
                    ${formatCurrency(totals.totalGeneral - totalGastosUsd - (totals.totalInventario || 0))}
                  </h2>

                  <div className="flex items-center gap-2 mt-4 text-emerald-700/80">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Rendimiento Operativo Final
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white mt-10 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Moneda Nacional (VES)</span>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-md">Equivalente USD</span>
                  </div>

                  {[
                    { label: "P. VentaD", bs: totals.totalPuntosVentaDebitoBs, usd: totals.totalPuntosVentaDebitoUsd, icon: <CreditCard className="w-4 h-4 text-slate-400" /> },
                    { label: "P. VentaC", bs: totals.totalPuntosVentaCreditoBs, usd: totals.totalPuntosVentaCreditoUsd, icon: <CreditCard className="w-4 h-4 text-slate-300" /> },
                    { label: "Pago Móvil", bs: totals.totalPagomovilBs, usd: totals.totalPagomovilUsd, icon: <Wallet className="w-4 h-4 text-slate-400" /> },
                    { label: "Efectivo Bs", bs: totals.totalEfectivoBs, usd: totals.totalEfectivoUsdFromBs, icon: <Banknote className="w-4 h-4 text-slate-400" /> },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100">
                      {/* Parte Izquierda: Icono y Nombre */}
                      <div className="flex items-center gap-3 w-1/3">
                        {item.icon}
                        <span className="text-sm font-semibold text-slate-600 truncate">{item.label}</span>
                      </div>
                      {/* Parte Central: Monto en Bolívares */}
                      <div className="flex-1 text-right pr-4">
                        <span className="font-bold text-slate-900 text-sm">{formatBs(item.bs)}</span>
                      </div>

                      {/* Parte Derecha: Monto en Dólares (Badge) */}
                      <div className="w-24 text-right">
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          ${formatCurrency(item.usd)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Subtotal Final */}
                  <div className="mt-4 pt-4 border-t border-dashed">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">Total en Moneda Nacional</span>
                      <span className="text-lg font-black text-slate-900">{formatBs(totals.totalPuntosVentaDebitoBs + totals.totalPuntosVentaCreditoBs + totals.totalPagomovilBs + totals.totalEfectivoBs)}</span>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        ≈ ${formatCurrency(totals.totalPuntosVentaDebitoUsd + totals.totalPuntosVentaCreditoUsd + totals.totalPagomovilUsd + totals.totalEfectivoUsdFromBs)} Total USD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {/* Cuentas por Pagar (Cartera) */}
            <div className=" rounded-[2.5rem] p-8 shadow-xl shadow-blue-100 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:rotate-12 transition-transform duration-500"><Receipt className="w-40 h-40" /></div>
              <p className="text-2xl font-black pb-4 uppercase tracking-widest">Cuentas por Pagar</p>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">Pendientes p/pago</span>
                    <span className="text-xs font-bold text-slate-500">{cuentasHook.cuentasActivas.length} documentos</span>
                  </div>
                  <div className="text-2xl font-black">${formatCurrency(cuentasHook.totalActivasUsd)}</div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-tighter">pagado en el periodo</span>
                  </div>
                  <div className="text-2xl font-black">${formatCurrency(cuentasHook.totalPagadasUsd)}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* SECCIÓN ESTADÍSTICAS (Balance entre meses) */}
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between items-center px-2">
          {filtrosActivos && (
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {cuadres.length} Cuadres Procesados
              </span>
            </div>
          )}
        </div>
      </div>
      <ExportarTodoExcel fechaInicio={fechaInicio} fechaFin={fechaFin} farmacias={FARMACIAS_EJEMPLO} />
    </div>
  );
};

export default TotalGeneralFarmaciasPage;
