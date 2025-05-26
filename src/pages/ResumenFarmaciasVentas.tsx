import React, { useEffect, useState } from "react";
import ResumeCardFarmacia from "@/components/ResumeCardFarmacia";

type VentasFarmacia = {
    totalVentas: number;
    totalBs: number;
    totalBsEnUsd: number;
    totalUsd: number;
    efectivoUsd: number;
    zelleUsd: number;
    faltantes: number;
    sobrantes: number;
    totalGeneralSinRecargas: number; // Nuevo campo
    totalUsdSinRecargas: number; // Nuevo campo
    valesUsd: number; // Agregar vales en USD
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ResumenFarmaciasVentas: React.FC = () => {
    const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
    const [ventas, setVentas] = useState<{ [key: string]: VentasFarmacia }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mes, setMes] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [detallesVisibles, setDetallesVisibles] = useState<{ [key: string]: boolean }>({});
    const [cuadresPorFarmacia, setCuadresPorFarmacia] = useState<{ [key: string]: any[] }>({});

    // Filtros de fecha para búsqueda por día
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");

    // Helpers para fechas rápidas
    const setHoy = () => {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, "0");
        const dd = String(hoy.getDate()).padStart(2, "0");
        const fecha = `${yyyy}-${mm}-${dd}`;
        setFechaInicio(fecha);
        setFechaFin(fecha);
    };
    const setAyer = () => {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const yyyy = ayer.getFullYear();
        const mm = String(ayer.getMonth() + 1).padStart(2, "0");
        const dd = String(ayer.getDate()).padStart(2, "0");
        const fecha = `${yyyy}-${mm}-${dd}`;
        setFechaInicio(fecha);
        setFechaFin(fecha);
    };
    const setSemanaActual = () => {
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const yyyyInicio = monday.getFullYear();
        const mmInicio = String(monday.getMonth() + 1).padStart(2, "0");
        const ddInicio = String(monday.getDate()).padStart(2, "0");
        const yyyyFin = sunday.getFullYear();
        const mmFin = String(sunday.getMonth() + 1).padStart(2, "0");
        const ddFin = String(sunday.getDate()).padStart(2, "0");
        setFechaInicio(`${yyyyInicio}-${mmInicio}-${ddInicio}`);
        setFechaFin(`${yyyyFin}-${mmFin}-${ddFin}`);
    };
    // Botón para buscar por quincena
    const setQuincena = () => {
        if (!mes) return;
        const [yyyy, mm] = mes.split("-");
        // Si la fecha de hoy es antes del 16, mostrar del 1 al 15, si no, del 16 al fin de mes
        const today = new Date();
        const isPrimeraQuincena = today.getDate() < 16;
        if (isPrimeraQuincena) {
            setFechaInicio(`${yyyy}-${mm}-01`);
            setFechaFin(`${yyyy}-${mm}-15`);
        } else {
            // Último día del mes
            const lastDayDate = new Date(Number(yyyy), Number(mm), 0);
            const lastDay = String(lastDayDate.getDate()).padStart(2, "0");
            setFechaInicio(`${yyyy}-${mm}-16`);
            setFechaFin(`${yyyy}-${mm}-${lastDay}`);
        }
    };

    // Botón para seleccionar el mes actual
    const setMesActual = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const firstDay = `${yyyy}-${mm}-01`;
        const lastDayDate = new Date(yyyy, now.getMonth() + 1, 0);
        const lastDay = `${yyyy}-${mm}-${String(lastDayDate.getDate()).padStart(2, "0")}`;
        setMes(`${yyyy}-${mm}`);
        setFechaInicio(firstDay);
        setFechaFin(lastDay);
    };

    useEffect(() => {
        const fetchFarmacias = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/farmacias`);
                if (!res.ok) throw new Error("Error al obtener farmacias");
                const data = await res.json();
                const lista = data.farmacias
                    ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
                    : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
                setFarmacias(lista);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchFarmacias();
    }, []);

    useEffect(() => {
        const fetchAllCuadres = async () => {
            setLoading(true);
            try {
                const result: { [key: string]: any[] } = {};
                await Promise.all(
                    farmacias.map(async (farm) => {
                        const res = await fetch(`${API_BASE_URL}/cuadres/${farm.id}`);
                        const data = await res.json();
                        result[farm.id] = data;
                    })
                );
                setCuadresPorFarmacia(result);
            } catch {
                setError("Error al cargar cuadres");
            } finally {
                setLoading(false);
            }
        };
        if (farmacias.length > 0) fetchAllCuadres();
    }, [farmacias, mes]);

    // Cambiar el cálculo de ventas para filtrar por rango de fecha si está seleccionado
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
            data.forEach((c: any) => {
                if (!c.dia || c.estado !== "verified") return;
                // Si hay filtro de fecha, usarlo
                if ((fechaInicio && c.dia < fechaInicio) || (fechaFin && c.dia > fechaFin)) return;
                let sumaBs = Number(c.recargaBs || 0) + Number(c.pagomovilBs || 0) + Number(c.efectivoBs || 0);
                if (Array.isArray(c.puntosVenta)) {
                    sumaBs += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0), 0);
                }
                sumaBs -= Number(c.devolucionesBs || 0);
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
                totalBsEnUsd: 0,
                totalUsd: Number(totalUsd.toFixed(2)),
                efectivoUsd: Number(efectivoUsd.toFixed(2)),
                zelleUsd: Number(zelleUsd.toFixed(2)),
                faltantes: Number(faltantes.toFixed(2)),
                sobrantes: Number(sobrantes.toFixed(2)),
                totalGeneralSinRecargas: Number(totalGeneralSinRecargas.toFixed(2)),
                totalUsdSinRecargas: 0,
                valesUsd: Number(valesUsd.toFixed(2)),
            };
        });
        setVentas(ventasPorFarmacia);
    }, [cuadresPorFarmacia, farmacias, fechaInicio, fechaFin]);

    const sortedFarmacias = [...farmacias].sort((a, b) => {
        const ventasA = ventas[a.id]?.totalVentas || 0;
        const ventasB = ventas[b.id]?.totalVentas || 0;
        return ventasB - ventasA;
    });

    const calcularDetalles = (farmId: string) => {
        const ventasFarm = ventas[farmId];
        if (!ventasFarm) return null;
        const [anioSel, mesSel] = mes.split("-");
        const cuadresFarmacia = cuadresPorFarmacia[farmId] || [];
        let sumaRecargaBs = 0,
            sumaPagomovilBs = 0,
            sumaEfectivoBs = 0,
            sumaPuntoDebito = 0,
            sumaPuntoCredito = 0,
            sumaDevolucionesBs = 0;

        if (cuadresFarmacia.length) {
            cuadresFarmacia.forEach((c: any) => {
                if (!c.dia || c.estado !== "verified") return;
                const [anio, mesDb] = c.dia.split("-");
                if (anio === anioSel && mesDb === mesSel) {
                    sumaRecargaBs += Number(c.recargaBs || 0);
                    sumaPagomovilBs += Number(c.pagomovilBs || 0);
                    sumaEfectivoBs += Number(c.efectivoBs || 0);
                    sumaDevolucionesBs += Number(c.devolucionesBs || 0);
                    if (Array.isArray(c.puntosVenta)) {
                        sumaPuntoDebito += c.puntosVenta.reduce(
                            (acc: number, pv: any) => acc + Number(pv.puntoDebito || 0),
                            0
                        );
                        sumaPuntoCredito += c.puntosVenta.reduce(
                            (acc: number, pv: any) => acc + Number(pv.puntoCredito || 0),
                            0
                        );
                    }
                }
            });
        }

        return (
            <div className="bg-white border border-gray-200 rounded p-3 mt-3 text-sm shadow-sm">
                <div className="mb-1"><strong>Total Bs:</strong> {ventasFarm.totalBs}</div>
                <div className="mb-1"><strong>Total USD:</strong> {ventasFarm.totalUsd}</div>
                <div className="mb-1"><strong>Efectivo USD:</strong> {ventasFarm.efectivoUsd}</div>
                <div className="mb-1"><strong>Zelle USD:</strong> {ventasFarm.zelleUsd}</div>
                <div className="mb-1"><strong>Faltantes USD:</strong> {ventasFarm.faltantes}</div>
                <div className="mb-3"><strong>Sobrantes USD:</strong> {ventasFarm.sobrantes}</div>
                <hr className="border-gray-300 mb-3" />
                <div className="mb-1"><strong>Recarga Bs:</strong> {sumaRecargaBs}</div>
                <div className="mb-1"><strong>Pago Móvil Bs:</strong> {sumaPagomovilBs}</div>
                <div className="mb-1"><strong>Efectivo Bs:</strong> {sumaEfectivoBs}</div>
                <div className="mb-1"><strong>Punto de Venta Débito Bs:</strong> {sumaPuntoDebito}</div>
                <div className="mb-1"><strong>Punto de Venta Crédito Bs:</strong> {sumaPuntoCredito}</div>
                <div><strong>Devoluciones Bs:</strong> {sumaDevolucionesBs}</div>
            </div>
        );
    };

    // Cuando cambie el mes, actualizar el rango de fechas automáticamente SIEMPRE
    const handleMesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nuevoMes = e.target.value;
        setMes(nuevoMes);
        if (nuevoMes) {
            const [yyyy, mm] = nuevoMes.split("-");
            const firstDay = `${yyyy}-${mm}-01`;
            const lastDayDate = new Date(Number(yyyy), Number(mm), 0);
            const lastDay = `${yyyy}-${mm}-${String(lastDayDate.getDate()).padStart(2, "0")}`;
            setFechaInicio(firstDay);
            setFechaFin(lastDay);
        }
    };

    if (loading)
        return <div className="text-center py-10 text-gray-600">Cargando...</div>;
    if (error)
        return (
            <div className="text-center py-10 text-red-600 font-semibold">{error}</div>
        );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                            Resumen de Ventas Mensuales por Farmacia
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Consulta el resumen de ventas mensuales por farmacia.
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-col gap-2">
                        <label htmlFor="mes" className="block text-sm font-medium text-gray-700 mb-1">
                            Selecciona un mes:
                        </label>
                        <input
                            id="mes"
                            type="month"
                            value={mes}
                            onChange={handleMesChange}
                            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <div className="flex flex-row gap-1 mt-2">
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={e => setFechaInicio(e.target.value)}
                                className="border rounded p-1 text-xs"
                                placeholder="Desde"
                            />
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={e => setFechaFin(e.target.value)}
                                className="border rounded p-1 text-xs"
                                placeholder="Hasta"
                            />
                            <button type="button" className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={setAyer}>Ayer</button>
                            <button type="button" className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={setHoy}>Hoy</button>
                            <button type="button" className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={setSemanaActual}>Esta Semana</button>
                            <button type="button" className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={setQuincena}>Quincena</button>
                            <button type="button" className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200" onClick={setMesActual}>Mes Actual</button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {sortedFarmacias.map((farm, idx) => (
                        <div key={farm.id}>
                            <ResumeCardFarmacia
                                nombre={farm.nombre}
                                totalVentas={ventas[farm.id]?.totalVentas || 0}
                                totalBs={ventas[farm.id]?.totalBs || 0}
                                totalBsEnUsd={ventas[farm.id]?.totalBsEnUsd || 0}
                                totalUsd={ventas[farm.id]?.totalUsd || 0}
                                efectivoUsd={ventas[farm.id]?.efectivoUsd || 0}
                                zelleUsd={ventas[farm.id]?.zelleUsd || 0}
                                faltantes={ventas[farm.id]?.faltantes || 0}
                                sobrantes={ventas[farm.id]?.sobrantes || 0}
                                totalGeneralSinRecargas={ventas[farm.id]?.totalGeneralSinRecargas || 0} // Añadido para corregir el error
                                valesUsd={ventas[farm.id]?.valesUsd || 0} // Agregar vales en USD
                                top={idx < 3} // Restaurar el uso de `idx` para determinar los top 3
                            />

                            <button
                                className="mt-2 text-gray-700 underline text-sm hover:text-gray-900"
                                onClick={() =>
                                    setDetallesVisibles((v) => ({ ...v, [farm.id]: !v[farm.id] }))
                                }
                            >
                                {detallesVisibles[farm.id] ? "Ocultar detalles" : "Mostrar detalles"}
                            </button>
                            {detallesVisibles[farm.id] && (
                                <div>
                                    {calcularDetalles(farm.id)}
                                    <div className="bg-white border border-gray-200 rounded p-3 mt-3 text-sm shadow-sm">
                                        <div className="mb-1"><strong>Total General sin Recargas:</strong> {ventas[farm.id]?.totalGeneralSinRecargas || 0}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResumenFarmaciasVentas;