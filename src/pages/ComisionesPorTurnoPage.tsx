import React, { useState } from "react";

const ComisionesPorTurnoPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comisiones, setComisiones] = useState<any[]>([]);

  const handleFetchComisiones = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/comisiones?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      setComisiones(data);
    } catch (error) {
      console.error("Error al obtener las comisiones:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">
        Comisiones por Turno
      </h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de Inicio
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de Fin
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        />
      </div>
      <button
        onClick={handleFetchComisiones}
        className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition mb-4"
      >
        Obtener Comisiones
      </button>
      {comisiones.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {comisiones.map((comision, index) => (
            <li key={index} className="py-4">
              <p className="text-sm text-gray-600">Cajero: {comision.cajero}</p>
              <p className="text-sm text-gray-600">Turno: {comision.turno}</p>
              <p className="text-sm text-gray-600">Comisión: {comision.comision}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center text-gray-500">No hay comisiones disponibles.</div>
      )}
    </div>
  );
};

export default ComisionesPorTurnoPage;
