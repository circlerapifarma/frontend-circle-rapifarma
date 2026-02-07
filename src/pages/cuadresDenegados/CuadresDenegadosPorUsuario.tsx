// components/CuadresDenegadosPorUsuarioCards.tsx
import { useState, useMemo } from 'react';
import type { CuadreDetallado } from '@/hooks/types';
import { getCurrentMonthRange } from './utils/date';
import { useCuadresDetallados } from '@/hooks/useCuadresV2';
import { groupBy } from './utils/groupBy';

interface Props {
    farmacia?: string;
}

const { inicio: defaultInicio, fin: defaultFin } = getCurrentMonthRange();

export const CuadresDenegadosPorUsuario: React.FC<Props> = ({ farmacia }) => {
    const [fechaInicio, setFechaInicio] = useState(defaultInicio);
    const [fechaFin, setFechaFin] = useState(defaultFin);
    const [search, setSearch] = useState('');

    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [selectedUserCuadres, setSelectedUserCuadres] = useState<CuadreDetallado[]>([]);

    const { cuadres, isLoading, isError } = useCuadresDetallados({
        farmacia,
        fechaInicio,
        fechaFin,
        estado: 'denied',
    });

    const cuadresFiltrados = useMemo(
        () =>
            cuadres.filter((c) =>
                c.cajero.toLowerCase().includes(search.toLowerCase())
            ),
        [cuadres, search]
    );

    const grouped = useMemo(
        () => groupBy<CuadreDetallado, 'cajero'>(cuadresFiltrados, 'cajero'),
        [cuadresFiltrados]
    );

    const cuadresPorUsuario = useMemo(
        () =>
            Object.entries(grouped).map(([cajero, items]) => {
                const totalBs = items.reduce((sum, c) => sum + c.totalBs, 0);
                const totalUsd = items.reduce((sum, c) => sum + c.totalGeneralUsd, 0);
                const totalFaltanteUsd = items.reduce((sum, c) => sum + c.faltanteUsd, 0);
                const totalSobranteUsd = items.reduce((sum, c) => sum + c.sobranteUsd, 0);

                return {
                    cajero,
                    items,
                    totalCuadres: items.length,
                    totalBs,
                    totalUsd,
                    totalFaltanteUsd,
                    totalSobranteUsd,
                    primerosDias: items
                        .slice(0, 3)
                        .map((c) => c.fecha)
                        .join(', '),
                };
            }).sort((a, b) => b.totalCuadres - a.totalCuadres),

        [grouped]
    );

    const openDetalle = (cajero: string) => {
        setSelectedUser(cajero);
        setSelectedUserCuadres(grouped[cajero] ?? []);
    };

    const closeDetalle = () => {
        setSelectedUser(null);
        setSelectedUserCuadres([]);
    };

    return (
        <div className="space-y-6">
            {/* Filtros Container */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fecha inicio</label>
                        <input
                            type="date"
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fecha fin</label>
                        <input
                            type="date"
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 min-w-[240px] flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Buscar usuario</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Nombre del cajero..."
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="absolute left-3 top-2.5 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center gap-3 p-8 justify-center text-slate-500 animate-pulse">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="font-medium">Cargando cuadres denegados...</p>
                </div>
            )}

            {isError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <span className="text-lg">⚠️</span> Error cargando cuadres. Por favor intente de nuevo.
                </div>
            )}

            {!isLoading && !isError && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-4">
                        {cuadresPorUsuario.map((u) => (
                            <div
                                key={u.cajero}
                                className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-0.5">
                                        <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{u.cajero}</h3>
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">
                                            {fechaInicio} • {fechaFin}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-tighter">
                                        Denegados
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Cuadres</p>
                                        <p className="text-lg font-bold text-slate-700 leading-tight">{u.totalCuadres}</p>
                                    </div>
                                    <div className="space-y-1 text-right border-l border-slate-200 pl-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total USD</p>
                                        <p className="text-lg font-bold text-slate-700 leading-tight">${u.totalUsd.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1 pt-2 border-t border-slate-200">
                                        <p className="text-[10px] font-bold text-red-400 uppercase">Faltante</p>
                                        <p className="font-bold text-red-600">-${u.totalFaltanteUsd.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1 pt-2 border-t border-slate-200 text-right">
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase">Sobrante</p>
                                        <p className="font-bold text-emerald-600">+${u.totalSobranteUsd.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Últimos registros</p>
                                        <p className="text-[11px] text-slate-500 italic truncate max-w-[150px]">
                                            {u.primerosDias || '—'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => openDetalle(u.cajero)}
                                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-slate-200"
                                    >
                                        Detalles
                                    </button>
                                </div>
                            </div>
                        ))}

                        {cuadresPorUsuario.length === 0 && (
                            <div className="col-span-full py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 italic">
                                <span className="text-4xl mb-2">🔍</span>
                                <p>No se encontraron resultados para los filtros aplicados.</p>
                            </div>
                        )}
                    </div>

                    {/* Modal de detalle */}
                    {selectedUser && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                                <div className="flex justify-between items-center px-8 py-6 bg-slate-50 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">
                                            Detalle de cuadres: <span className="text-blue-600">{selectedUser}</span>
                                        </h2>
                                        <p className="text-xs font-medium text-slate-500 mt-1">
                                            Periodo consultado: {fechaInicio} hasta {fechaFin}
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeDetalle}
                                        className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all active:scale-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="overflow-auto p-8 custom-scrollbar">
                                    <table className="min-w-full border-separate border-spacing-0">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-3 bg-slate-100 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest rounded-l-xl border-y border-l border-slate-200">Fecha</th>
                                                <th className="px-4 py-3 bg-slate-100 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest border-y border-slate-200">Caja</th>
                                                <th className="px-4 py-3 bg-slate-100 text-left text-[10px] font-bold text-slate-600 uppercase tracking-widest border-y border-slate-200">Turno</th>
                                                <th className="px-4 py-3 bg-slate-100 text-right text-[10px] font-bold text-slate-600 uppercase tracking-widest border-y border-slate-200">Total Bs</th>
                                                <th className="px-4 py-3 bg-slate-100 text-right text-[10px] font-bold text-slate-600 uppercase tracking-widest border-y border-slate-200">Total USD</th>
                                                <th className="px-4 py-3 bg-slate-100 text-right text-[10px] font-bold text-slate-600 uppercase tracking-widest rounded-r-xl border-y border-r border-slate-200">Diferencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedUserCuadres.map((c) => (
                                                <tr key={c._id} className="group hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-4 py-4 text-sm text-center font-bold text-slate-500 bg-slate-50/50 group-hover:bg-transparent">{c.fecha}</td>
                                                    <td className="px-4 py-4 text-sm text-center font-bold text-slate-500 bg-slate-50/50 group-hover:bg-transparent">#{c.cajaNumero}</td>
                                                    <td className="px-4 py-4 text-sm text-slate-600 font-medium lowercase first-letter:uppercase">{c.turno}</td>
                                                    <td className="px-4 py-4 text-sm text-right font-mono text-slate-600">
                                                        {c.totalBs.toLocaleString('es-VE', {
                                                            style: 'currency',
                                                            currency: 'VED',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-right font-bold text-slate-800">
                                                        ${c.totalGeneralUsd.toFixed(2)}
                                                    </td>
                                                    <td className={`px-4 py-4 text-sm text-right font-bold ${c.diferenciaUsd < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {c.diferenciaUsd > 0 ? '+' : ''}{c.diferenciaUsd.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {selectedUserCuadres.length === 0 && (
                                        <div className="py-12 text-center text-slate-400 font-medium">
                                            No hay cuadres registrados para este usuario.
                                        </div>
                                    )}
                                </div>

                                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">Vista detallada de auditoría v2.0</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};