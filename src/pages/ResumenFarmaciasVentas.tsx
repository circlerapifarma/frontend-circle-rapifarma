import React, { useEffect, useState } from "react";
import ResumeCardFarmacia from "@/components/ResumeCardFarmacia";

const ResumenFarmaciasVentas: React.FC = () => {
    const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10)); // "YYYY-MM-DD"

    useEffect(() => {
        const fetchFarmacias = async () => {
            try {
                const res = await fetch("http://localhost:8000/farmacias");
                if (!res.ok) throw new Error("Error al obtener farmacias");
                const data = await res.json();
                const lista = Object.entries(data).map(([id, nombre]) => ({
                    id,
                    nombre,
                }));
                setFarmacias(lista);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchFarmacias();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-900 mb-2">Resumen de Ventas por Farmacia</h1>
                        <p className="text-gray-600">Consulta el resumen de ventas por farmacia para la fecha seleccionada.</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fecha">
                            Selecciona una fecha:
                        </label>
                        <input
                            id="fecha"
                            type="date"
                            value={dia}
                            onChange={e => setDia(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            max={new Date().toISOString().slice(0, 10)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span className="ml-2 text-blue-700 font-semibold">Cargando farmacias...</span>
                    </div>
                ) : error ? (
                    <div className="text-red-600 text-center font-semibold">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {farmacias.map(f => (
                            <ResumeCardFarmacia
                                key={f.id}
                                farmaciaId={f.id}
                                farmaciaNombre={f.nombre}
                                dia={dia}
                                onDetalle={(farmaciaId, dia) => {
                                    // Aquí puedes abrir un modal, navegar, etc.
                                    alert(`Detalles de ${farmaciaId} para el día ${dia}`);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumenFarmaciasVentas;