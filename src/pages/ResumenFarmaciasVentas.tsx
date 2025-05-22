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
};

const ResumenFarmaciasVentas: React.FC = () => {
    const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
    const [ventas, setVentas] = useState<{ [key: string]: VentasFarmacia }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mes, setMes] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    useEffect(() => {
        const fetchFarmacias = async () => {
            try {
                const res = await fetch("http://localhost:8000/farmacias");
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
        const fetchVentas = async () => {
            setLoading(true);
            try {
                const ventasPorFarmacia: { [key: string]: VentasFarmacia } = {};
                await Promise.all(
                    farmacias.map(async (farm) => {
                        const res = await fetch(`http://localhost:8000/cuadres/${farm.id}`);
                        const data = await res.json();
                        const [anioSel, mesSel] = mes.split("-");
                        let totalBs = 0;
                        let totalUsd = 0;
                        let totalGeneral = 0;
                        let efectivoUsd = 0;
                        let zelleUsd = 0;
                        let faltantes = 0;
                        let sobrantes = 0;
                        data.forEach((c: any) => {
                            if (!c.dia || c.estado !== "verified") return;
                            const [anio, mesDb] = c.dia.split("-");
                            if (anio === anioSel && mesDb === mesSel) {
                                // Sumar Bs
                                let sumaBs = Number(c.recargaBs || 0) + Number(c.pagomovilBs || 0) + Number(c.efectivoBs || 0);
                                if (Array.isArray(c.puntosVenta)) {
                                    sumaBs += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0), 0);
                                }
                                sumaBs -= Number(c.devolucionesBs || 0);
                                totalBs += sumaBs;
                                // Sumar USD
                                const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
                                totalUsd += sumaUsd;
                                efectivoUsd += Number(c.efectivoUsd || 0);
                                zelleUsd += Number(c.zelleUsd || 0);
                                // Total general (USD directo + Bs convertidos a USD por tasa de ese cuadre)
                                const tasa = Number(c.tasa || 0);
                                if (tasa > 0) {
                                    totalGeneral += sumaUsd + (sumaBs / tasa);
                                } else {
                                    totalGeneral += sumaUsd;
                                }
                                faltantes += Number(c.faltanteUsd || 0);
                                sobrantes += Number(c.sobranteUsd || 0);
                            }
                        });
                        ventasPorFarmacia[farm.id] = {
                            totalVentas: Number(totalGeneral.toFixed(2)),
                            totalBs: Number(totalBs.toFixed(2)),
                            totalBsEnUsd: 0, // No se usa en este nuevo cálculo
                            totalUsd: Number(totalUsd.toFixed(2)),
                            efectivoUsd: Number(efectivoUsd.toFixed(2)),
                            zelleUsd: Number(zelleUsd.toFixed(2)),
                            faltantes: Number(faltantes.toFixed(2)),
                            sobrantes: Number(sobrantes.toFixed(2)),
                        };
                    })
                );
                setVentas(ventasPorFarmacia);
            } catch (err) {
                setError("Error al cargar ventas");
            } finally {
                setLoading(false);
            }
        };
        if (farmacias.length > 0) fetchVentas();
    }, [farmacias, mes]);

    const sortedFarmacias = [...farmacias].sort((a, b) => {
      const ventasA = ventas[a.id]?.totalVentas || 0;
      const ventasB = ventas[b.id]?.totalVentas || 0;
      return ventasB - ventasA;
    });

    if (loading) return <div className="text-center py-10">Cargando...</div>;
    if (error) return <div className="text-center text-red-600 py-10">{error}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-900 mb-2">Resumen de Ventas Mensuales por Farmacia</h1>
                        <p className="text-gray-600">Consulta el resumen de ventas mensuales por farmacia.</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mes">
                            Selecciona un mes:
                        </label>
                        <input
                            id="mes"
                            type="month"
                            value={mes}
                            onChange={e => setMes(e.target.value)}
                            className="border rounded p-2"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {sortedFarmacias.map((farm, idx) => (
                        <ResumeCardFarmacia
                            key={farm.id}
                            nombre={farm.nombre}
                            totalVentas={ventas[farm.id]?.totalVentas || 0}
                            totalBs={ventas[farm.id]?.totalBs || 0}
                            totalBsEnUsd={ventas[farm.id]?.totalBsEnUsd || 0}
                            totalUsd={ventas[farm.id]?.totalUsd || 0}
                            efectivoUsd={ventas[farm.id]?.efectivoUsd || 0}
                            zelleUsd={ventas[farm.id]?.zelleUsd || 0}
                            faltantes={ventas[farm.id]?.faltantes || 0}
                            sobrantes={ventas[farm.id]?.sobrantes || 0}
                            top={idx < 3}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResumenFarmaciasVentas;