// components/EstadisticasMensuales.tsx
import React, { useMemo, useState } from "react";
import {
    Loader2, RefreshCcw, BarChart3, Building2,
    TrendingUp, TrendingDown, ArrowRightLeft,
    Wallet, Receipt, Scale, AlertCircle,
    Smartphone
} from "lucide-react";
import { motion } from "framer-motion";
import { useCuadresDetallados } from "@/hooks/useCuadresV2";
import { useGastosPorEstado } from "@/hooks/useGastosPorEstado";
import { useCuentasPorPagar } from "@/hooks/useCuentasPorPagar";

// --- TIPOS Y UTILIDADES ---

const FARMACIAS_EJEMPLO = [
    { value: "", label: "Consolidado Global" },
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

const MES_NOMBRES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPercent = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;

// --- SUB-COMPONENTE: TARJETA DE COMPARACIÓN ---
interface StatRowProps {
    title: string;
    icon: React.ElementType;
    valCurrent: number;
    valPrevious: number;
    isExpense?: boolean; // Si es true, subir es malo (rojo)
    delay?: number;
}

const StatRow: React.FC<StatRowProps> = ({ title, icon: Icon, valCurrent, valPrevious, isExpense = false, delay = 0 }) => {
    const diff = valCurrent - valPrevious;
    const percent = valPrevious !== 0 ? (diff / valPrevious) * 100 : 0;

    // Lógica de color semántica
    const isPositiveTrend = isExpense ? diff < 0 : diff > 0;
    const colorClass = isPositiveTrend ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-700">{title}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
                    {isPositiveTrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatPercent(percent)}
                </div>
            </div>

            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-3xl font-black text-slate-800">${formatCurrency(valCurrent)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Periodo Actual</p>
                </div>

                <div className="text-right pb-1">
                    <p className="text-md font-bold text-slate-500 decoration-slate-300 decoration-2">${formatCurrency(valPrevious)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Periodo Anterior</p>
                </div>
            </div>

            {/* Barra visual de progreso */}
            <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    className={`h-full ${isPositiveTrend ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ opacity: 0.2 }}
                />
            </div>
        </motion.div>
    );
};

// --- COMPONENTE PRINCIPAL ---

const EstadisticasMensuales: React.FC = () => {
    // Estados de fecha
    const now = new Date();
    const [mes1, setMes1] = useState<string>((now.getMonth() + 1).toString());
    const [anio1, setAnio1] = useState<number>(now.getFullYear());
    const [mes2, setMes2] = useState<string>((now.getMonth() === 0 ? 12 : now.getMonth()).toString());
    const [anio2, setAnio2] = useState<number>(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");

    // Helpers de fecha
    const getFechaRange = (m: string, a: number) => {
        const mes = parseInt(m);
        return {
            inicio: new Date(a, mes - 1, 1).toISOString().slice(0, 10),
            fin: new Date(a, mes, 0).toISOString().slice(0, 10),
            label: `${MES_NOMBRES[mes - 1]} ${a}`
        };
    };

    const range1 = useMemo(() => getFechaRange(mes1, anio1), [mes1, anio1]);
    const range2 = useMemo(() => getFechaRange(mes2, anio2), [mes2, anio2]);

    // --- DATA FETCHING (Periodo Actual - Izquierda) ---
    const dataMes1 = {
        cuadres: useCuadresDetallados({ farmacia: farmaciaSeleccionada || undefined, fechaInicio: range1.inicio, fechaFin: range1.fin, estado: "verified" }),
        gastos: useGastosPorEstado({ estado: 'verified', fechaInicio: range1.inicio, fechaFin: range1.fin, localidad: farmaciaSeleccionada || undefined }),
        cuentas: useCuentasPorPagar({ startDate: range1.inicio, endDate: range1.fin, farmacia: farmaciaSeleccionada || undefined })
    };

    // --- DATA FETCHING (Periodo Anterior - Derecha) ---
    const dataMes2 = {
        cuadres: useCuadresDetallados({ farmacia: farmaciaSeleccionada || undefined, fechaInicio: range2.inicio, fechaFin: range2.fin, estado: "verified" }),
        gastos: useGastosPorEstado({ estado: 'verified', fechaInicio: range2.inicio, fechaFin: range2.fin, localidad: farmaciaSeleccionada || undefined }),
        cuentas: useCuentasPorPagar({ startDate: range2.inicio, endDate: range2.fin, farmacia: farmaciaSeleccionada || undefined })
    };

    const loading = dataMes1.cuadres.isLoading || dataMes1.gastos.isLoading || dataMes1.cuentas.isLoading ||
        dataMes2.cuadres.isLoading || dataMes2.gastos.isLoading || dataMes2.cuentas.isLoading;

    // --- CÁLCULOS UNIFICADOS ---
    const stats = useMemo(() => {
        const calc = (d: typeof dataMes1) => ({
            ventas: d.cuadres.totalUsd || 0,
            gastos: d.gastos.totalGastosUsd || 0,
            utilidad: (d.cuadres.totalUsd || 0) - (d.gastos.totalGastosUsd || 0),
            cuentasActivas: d.cuentas.totalActivasUsd || 0,
            sobrantes: d.cuadres.cuadres.reduce((acc, c) => acc + c.sobranteUsd, 0),
            faltantes: d.cuadres.cuadres.reduce((acc, c) => acc + c.faltanteUsd, 0),
            recargas: d.cuadres.cuadres.reduce((acc, c) => acc + (c.recargaBs / c.tasa || 0), 0),
        });

        return {
            current: calc(dataMes1),
            prev: calc(dataMes2)
        };
    }, [dataMes1, dataMes2]);

    const handleRefresh = () => window.location.reload();

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER & CONTROLES */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-3.5 rounded-2xl shadow-lg shadow-blue-200">
                                <Scale className="text-white w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comparador Financiero</h1>
                                <p className="text-slate-500 text-sm font-medium">Análisis de variación mensual</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                            <Building2 className="w-4 h-4 text-slate-400 ml-2" />
                            <select
                                value={farmaciaSeleccionada}
                                onChange={(e) => setFarmaciaSeleccionada(e.target.value)}
                                className="bg-transparent font-bold text-sm text-slate-700 py-2 pr-4 focus:outline-none"
                            >
                                {FARMACIAS_EJEMPLO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                        {/* PANEL IZQUIERDO (ACTUAL) */}
                        <div className="lg:col-span-5 bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
                            <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest ml-1 mb-2 block">Periodo A (Actual)</span>
                            <div className="flex gap-2">
                                <select value={mes1} onChange={(e) => setMes1(e.target.value)} className="flex-1 bg-white border-none rounded-xl py-3 px-4 font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-400">
                                    {MES_NOMBRES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                                <input type="number" value={anio1} onChange={(e) => setAnio1(Number(e.target.value))} className="w-24 bg-white border-none rounded-xl py-3 px-2 text-center font-bold text-slate-700 shadow-sm" />
                            </div>
                        </div>

                        {/* VS BADGE */}
                        <div className="lg:col-span-2 flex justify-center">
                            <div className="bg-slate-800 text-white font-black text-xl rounded-2xl w-12 h-12 flex items-center justify-center shadow-xl">VS</div>
                        </div>

                        {/* PANEL DERECHO (ANTERIOR) */}
                        <div className="lg:col-span-5 bg-slate-100 p-4 rounded-3xl border border-slate-200">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Periodo B (Comparativo)</span>
                            <div className="flex gap-2">
                                <select value={mes2} onChange={(e) => setMes2(e.target.value)} className="flex-1 bg-white border-none rounded-xl py-3 px-4 font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-slate-300">
                                    {MES_NOMBRES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                                <input type="number" value={anio2} onChange={(e) => setAnio2(Number(e.target.value))} className="w-24 bg-white border-none rounded-xl py-3 px-2 text-center font-bold text-slate-600 shadow-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all font-bold disabled:opacity-50 shadow-md">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                            Actualizar Análisis
                        </button>
                    </div>
                </motion.div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-bold animate-pulse">Calculando variaciones...</p>
                    </div>
                ) : (
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-8">

                        {/* 1. ROW PRINCIPAL DE KPIs */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatRow
                                title="Ventas Totales"
                                icon={BarChart3}
                                valCurrent={stats.current.ventas}
                                valPrevious={stats.prev.ventas}
                            />
                            <StatRow
                                title="Gastos Operativos"
                                icon={Receipt}
                                valCurrent={stats.current.gastos}
                                valPrevious={stats.prev.gastos}
                                isExpense={true} // Invertir lógica de color
                                delay={0.1}
                            />
                            <StatRow
                                title="Utilidad Neta"
                                icon={Wallet}
                                valCurrent={stats.current.utilidad}
                                valPrevious={stats.prev.utilidad}
                                delay={0.2}
                            />
                            <StatRow
                                title="Recargas y Servicios"
                                icon={Smartphone}
                                valCurrent={stats.current.recargas}
                                valPrevious={stats.prev.recargas}
                                delay={0.05} // Pequeño retraso para la animación
                            />
                        </section>

                        {/* 2. ANÁLISIS PROFUNDO */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Tarjeta Cuentas por Pagar */}
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600"><AlertCircle className="w-6 h-6" /></div>
                                    <h3 className="font-bold text-slate-800 text-lg">Deuda Flotante</h3>
                                </div>

                                <div className="relative pt-2">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Activas (Por Pagar)</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${stats.current.cuentasActivas < stats.prev.cuentasActivas ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {stats.current.cuentasActivas < stats.prev.cuentasActivas ? 'Disminución' : 'Aumento'}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-4 mb-6">
                                        <span className="text-4xl font-black text-slate-800">${formatCurrency(stats.current.cuentasActivas)}</span>
                                        <div className="flex flex-col justify-center items-center">
                                            <span className="text-xl font-bold text-slate-400">${formatCurrency(stats.prev.cuentasActivas)}</span>
                                            <span className="text-xs font-bold text-slate-400">deuda anterior</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-md text-slate-500 font-medium leading-relaxed">
                                            {stats.current.cuentasActivas > stats.prev.cuentasActivas
                                                ? "⚠️ La deuda activa ha aumentado respecto al periodo anterior. Se recomienda revisar el flujo de caja."
                                                : "✅ Buen trabajo. Has reducido los compromisos pendientes de pago comparado con el mes anterior."}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Tarjeta Eficiencia de Caja */}
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><ArrowRightLeft className="w-6 h-6" /></div>
                                    <h3 className="font-bold text-slate-800 text-lg">Precisión de Caja</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center">
                                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Sobrantes</span>
                                        <span className="text-2xl font-black text-emerald-700 mt-1">${formatCurrency(stats.current.sobrantes)}</span>
                                        <span className="text-xl font-bold text-emerald-600/60 mt-1">
                                            vs ${formatCurrency(stats.prev.sobrantes)}
                                        </span>
                                    </div>

                                    <div className="p-5 rounded-3xl bg-red-50 border border-red-100 flex flex-col items-center text-center">
                                        <span className="text-[10px] font-black uppercase text-red-400 tracking-widest">Faltantes</span>
                                        <span className="text-2xl font-black text-red-700 mt-1">${formatCurrency(stats.current.faltantes)}</span>
                                        <span className="text-xl font-bold text-red-600/60 mt-1">
                                            vs ${formatCurrency(stats.prev.faltantes)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center gap-3 text-md font-medium text-slate-500">
                                    <div className={`w-2 h-2 rounded-full ${stats.current.faltantes < stats.prev.faltantes ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span>
                                        {stats.current.faltantes < stats.prev.faltantes
                                            ? "Los faltantes en caja se han reducido. Mayor control operativo."
                                            : "Atención: Los faltantes han incrementado en este periodo."}
                                    </span>
                                </div>
                            </motion.div>

                        </section>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default EstadisticasMensuales;