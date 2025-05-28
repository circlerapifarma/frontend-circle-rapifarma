import React, { useState } from "react";

type Comision = {
  cajero: string;
  turno: string;
  comision: number;
};

const ComisionesPorTurnoPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFetchComisiones = async () => {
    if (!startDate || !endDate) {
      alert("Por favor selecciona ambas fechas");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/comisiones?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Error al obtener las comisiones");
      const data = await res.json();
      setComisiones(data);
      console.log("Comisiones obtenidas:", data);
    } catch (error) {
      console.error("Error al obtener las comisiones:", error);
      alert("Hubo un error al obtener las comisiones");
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por cajero
  const comisionesPorCajero = comisiones.reduce<Record<string, Comision[]>>((acc, comision) => {
    if (!acc[comision.cajero]) acc[comision.cajero] = [];
    acc[comision.cajero].push(comision);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">
        Comisiones por Turno
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleFetchComisiones}
        disabled={loading}
        className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition mb-6 disabled:opacity-50"
      >
        {loading ? "Cargando..." : "Obtener Comisiones"}
      </button>

      {Object.keys(comisionesPorCajero).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(comisionesPorCajero).map(([cajero, lista]) => (
            <div key={cajero} className="border p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{cajero}</h2>
              <ul className="divide-y divide-gray-200">
                {lista.map((item, index) => (
                  <li key={index} className="py-2 flex justify-between text-sm text-gray-700">
                    <span>Turno: <strong>{item.turno}</strong></span>
                    <span>Comisión: <strong>${(item.comision ?? 0).toFixed(2)}</strong></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="text-center text-gray-500">No hay comisiones disponibles.</div>
        )
      )}
    </div>
  );
};

export default ComisionesPorTurnoPage;
