import React, { useState } from "react";

type Comision = {
  cajero: string;
  turno: string;
  comision: number;
  totalVentas?: number;
  sobrante?: number;
  faltante?: number;
  farmacias?: Record<string, string> | string[];
  comisionPorcentaje?: number;
};

const ComisionesPorTurnoPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [farmaciaFiltro, setFarmaciaFiltro] = useState<string>("");

  // Adjusted to handle updated backend response structure
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

      // Updated to handle new backend response structure
      setComisiones(
        Array.isArray(data)
          ? data.map((item) => ({
              cajero: item.NOMBRE || "Sin nombre", // Ajuste para manejar valores vacíos
              turno: item.turno || "Sin turno",
              comision: item.comision || 0,
              totalVentas: item.totalVentas || 0,
              sobrante: item.sobrante || 0,
              faltante: item.faltante || 0,
              farmacias: item.farmacias || [],
              comisionPorcentaje: item.comisionPorcentaje || 0,
            }))
          : []
      );
      console.log("Comisiones obtenidas:", data);
    } catch (error) {
      console.error("Error al obtener las comisiones:", error);
      alert("Hubo un error al obtener las comisiones");
    } finally {
      setLoading(false);
    }
  };

  // Chips de farmacias únicas para filtrar
  const farmaciasUnicas = Array.from(
    new Set(
      comisiones
        .flatMap((c) =>
          Array.isArray(c.farmacias)
            ? c.farmacias
            : c.farmacias
            ? Object.values(c.farmacias)
            : []
        )
        .filter(Boolean)
    )
  );

  // Agrupar por cajero con filtro de farmacia
  const comisionesFiltradas = comisiones.filter((comision) => {
    const coincideBusqueda =
      comision.turno.toLowerCase().includes(search.toLowerCase()) ||
      comision.cajero.toLowerCase().includes(search.toLowerCase());
    const farmaciasArr = Array.isArray(comision.farmacias)
      ? comision.farmacias
      : comision.farmacias
      ? Object.values(comision.farmacias)
      : [];
    const coincideFarmacia =
      !farmaciaFiltro || farmaciasArr.includes(farmaciaFiltro);
    return coincideBusqueda && coincideFarmacia;
  });
  const comisionesPorCajero = comisionesFiltradas.reduce<Record<string, Comision[]>>((acc, comision) => {
    if (!acc[comision.cajero]) acc[comision.cajero] = [];
    acc[comision.cajero].push(comision);
    return acc;
  }, {});

  // Calcular el total de comisiones filtradas
  const totalComisionesFiltradas = comisionesFiltradas.reduce((acc, c) => acc + (Number(c.comision) || 0), 0);

  // Obtener farmacias del usuario autenticado desde localStorage
  const usuarioRaw = localStorage.getItem("usuario");
  let farmaciasUsuario: { [id: string]: string } = {};
  if (usuarioRaw) {
    try {
      const usuario = JSON.parse(usuarioRaw);
      farmaciasUsuario = usuario.farmacias || {};
    } catch {
      farmaciasUsuario = {};
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-2 text-center">
        Comisiones por Turno
      </h1>
      {Object.keys(farmaciasUsuario).length > 0 && (
        <div className="text-center text-sm text-gray-600 mb-4">
          Farmacia asignada: <span className="font-semibold text-blue-700">{Object.values(farmaciasUsuario).join(", ")}</span>
        </div>
      )}

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
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por descripción de turno o cajero..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleFetchComisiones}
        disabled={loading}
        className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition mb-6 disabled:opacity-50"
      >
        {loading ? "Cargando..." : "Obtener Comisiones"}
      </button>

      {/* Chips de filtro por farmacia */}
      <div className="mb-4 flex flex-wrap gap-2">
        {farmaciasUnicas.map((f) => (
          <button
            key={f}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
              farmaciaFiltro === f
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            }`}
            onClick={() => setFarmaciaFiltro(farmaciaFiltro === f ? "" : f)}
          >
            {f}
          </button>
        ))}
        {farmaciaFiltro && (
          <button
            className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-200 text-gray-700 border-gray-300 ml-2"
            onClick={() => setFarmaciaFiltro("")}
          >
            Limpiar filtro
          </button>
        )}
      </div>
      {/* Total de comisiones filtradas */}
      <div className="mb-4 text-right text-base font-semibold text-blue-800">
        Total comisión filtrada: ${Number(totalComisionesFiltradas).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {Object.keys(comisionesPorCajero).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(comisionesPorCajero).map(([cajero, lista]) => {
            // Calcular totales por cajero
            const totalComision = lista.reduce((acc, item) => acc + (Number(item.comision) || 0), 0);
            const totalVentas = lista.reduce((acc, item) => acc + (Number(item.totalVentas) || 0), 0);
            const totalSobrante = lista.reduce((acc, item) => acc + (Number(item.sobrante) || 0), 0);
            const totalFaltante = lista.reduce((acc, item) => acc + (Number(item.faltante) || 0), 0);
            return (
              <div key={cajero} className="border p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  {cajero}
                  {lista[0].farmacias && (
                    <span className="block text-xs text-blue-700 font-normal mt-1">
                      Farmacia(s): {Array.isArray(lista[0].farmacias) ? lista[0].farmacias.join(", ") : Object.values(lista[0].farmacias).join(", ")}
                    </span>
                  )}
                  <span className="block text-xs text-green-700 font-normal mt-1">
                    % Comisión: {lista[0].comisionPorcentaje ?? 0}
                  </span>
                </h2>
                <ul className="divide-y divide-gray-200">
                  {lista.map((item, index) => (
                    <li key={index} className="py-2 flex flex-col sm:flex-row sm:justify-between text-sm text-gray-700 gap-2">
                      <span>Nombre: <strong>{item.cajero}</strong></span>
                      <span>Turno: <strong>{item.turno}</strong></span>
                      <span>Total vendido: <strong>${Number(item.totalVentas ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      <span>Sobrante: <strong className="text-green-700">${Number(item.sobrante ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      <span>Faltante: <strong className="text-red-700">${Number(item.faltante ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      <span>Comisión: <strong>${Number(item.comision ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    </li>
                  ))}
                  {/* Fila de totales por cajero */}
                  <li className="pt-2 mt-2 border-t flex flex-col sm:flex-row sm:justify-between text-sm font-bold text-blue-900 bg-blue-50 rounded">
                    <span>Total</span>
                    <span>Comisión: ${totalComision.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span>Total vendido: ${totalVentas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span>Sobrante: <span className="text-green-700">${totalSobrante.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    <span>Faltante: <span className="text-red-700">${totalFaltante.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  </li>
                </ul>
              </div>
            );
          })}
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