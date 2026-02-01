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
        {/* Resumen Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-100 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Wallet className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-emerald-100">Utilidad</p>
                <h2 className="text-5xl font-black mb-6">${formatCurrency(totals.totalGeneral - totalGastosUsd - (totals.totalInventario || 0))}</h2>

                <div className="flex flex-wrap gap-6 border-t border-white/20 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg"><BarChart3 className="w-5 h-5" /></div>
                    <div>
                      <p className="text-md font-bold text-emerald-100 uppercase">Venta Bruta</p>
                      <p className="font-bold text-2xl">${formatCurrency(totals.totalGeneral)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg"><MinusCircle className="w-5 h-5" /></div>
                    <div>
                      <p className="text-md font-bold text-emerald-100 uppercase">Total Egresos (costo cuadres + gastos)</p>
                      <p className="font-bold text-2xl">-${formatCurrency(totalGastosUsd + (totals.totalInventario || 0))}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            {/* Costo de Inventario */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden border-l-4 border-l-green-500">
              <div className="relative z-10">
                <div className="flex flex-row justify-between">
                  <p className="text-[10px] font-black text-green-800 uppercase tracking-widest mb-1">Costo de Cuadres</p>
                  <MinusCircle className="w-4 h-4 text-green-800" />
                </div>
                <h3 className="text-3xl font-black text-slate-900">${formatCurrency(totals.totalInventario)}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-2 italic">Valor de reposición de mercancía vendida</p>
              </div>
              <div className="absolute -right-4 -bottom-4 text-slate-50 opacity-10">
                <Receipt className="w-24 h-24" />
              </div>
            </div>

            {/* Gastos Operativos */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm border-l-4 border-l-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Gastos Verificados</p>
                <MinusCircle className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-3xl font-black text-slate-900">${formatCurrency(totalGastosUsd)}</h3>
              <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${(totalGastosUsd / totals.totalGeneral * 100).toFixed(1)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Representa el {(totalGastosUsd / totals.totalGeneral * 100).toFixed(1)}% de la venta</p>
            </div>

            {/* Cuentas por Pagar (Cartera) */}
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
