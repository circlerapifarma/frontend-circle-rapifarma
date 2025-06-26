import React, { useEffect, useState } from "react";
import type { CuentaPorPagar } from "@/pages/cuentasPorPagar/visualizarCuentas/FilaCuentaPorPagar";

interface Props {
  farmaciaId: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const ListaCuentasPorPagarFarmacia: React.FC<Props> = ({ farmaciaId, fechaInicio, fechaFin }) => {
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCuentas = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, { headers });
        if (!res.ok) throw new Error("Error al cargar cuentas por pagar");
        const data = await res.json();
        // Filtrar por farmaciaId si se provee
        let cuentasFiltradas = farmaciaId ? data.filter((c: any) => c.farmacia === farmaciaId) : data;
        setCuentas(cuentasFiltradas);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    if (farmaciaId) fetchCuentas();
  }, [farmaciaId]);

  // Chip visual para el estado
  const EstadoChip: React.FC<{ estatus: string }> = ({ estatus }) => {
    let color = "bg-gray-200 text-gray-700";
    if (estatus === "wait") color = "bg-yellow-100 text-yellow-700 border border-yellow-400";
    else if (estatus === "activa") color = "bg-blue-100 text-blue-700 border border-blue-400";
    else if (estatus === "pagada") color = "bg-green-100 text-green-700 border border-green-400";
    else if (estatus === "anulada" || estatus === "inactiva") color = "bg-red-100 text-red-700 border border-red-400";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm ${color}`}>{estatus.charAt(0).toUpperCase() + estatus.slice(1)}</span>
    );
  };

  if (loading) return <div>Cargando cuentas por pagar...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Cuentas por Pagar de farmacia {farmaciaId}</h2>
      {cuentas && cuentas.length > 0 ? (
        <ul>
          {cuentas
            .filter((cuenta) => {
              if (fechaInicio && cuenta.fechaRecepcion < fechaInicio) return false;
              if (fechaFin && cuenta.fechaRecepcion > fechaFin) return false;
              return true;
            })
            .map((cuenta) => (
              <li key={cuenta._id} className="mb-2 border-b pb-2 flex flex-wrap items-center gap-2">
                Factura: <span className="font-mono">{cuenta.numeroFactura}</span> | Proveedor: {cuenta.proveedor} | Monto: <span className="font-semibold">Bs {cuenta.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span> | <EstadoChip estatus={cuenta.estatus} />
              </li>
            ))}
        </ul>
      ) : (
        <div>No hay cuentas por pagar registradas.</div>
      )}
    </div>
  );
};

export default ListaCuentasPorPagarFarmacia;
