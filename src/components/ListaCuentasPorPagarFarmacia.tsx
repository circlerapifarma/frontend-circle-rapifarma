import React, { useEffect, useState } from "react";
import type { CuentaPorPagar } from "@/pages/cuentasPorPagar/visualizarCuentas/FilaCuentaPorPagar";

interface Props {
  farmaciaId: string;
}

const ListaCuentasPorPagarFarmacia: React.FC<Props> = ({ farmaciaId }) => {
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCuentas = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cuentas-por-pagar?farmacia=${farmaciaId}`);
        if (!res.ok) throw new Error("Error al cargar cuentas por pagar");
        const data = await res.json();
        setCuentas(data);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    if (farmaciaId) fetchCuentas();
  }, [farmaciaId]);

  if (loading) return <div>Cargando cuentas por pagar...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Cuentas por Pagar de farmacia {farmaciaId}</h2>
      {cuentas && cuentas.length > 0 ? (
        <ul>
          {cuentas.map((cuenta) => (
            <li key={cuenta._id} className="mb-2 border-b pb-2">
              Factura: <span className="font-mono">{cuenta.numeroFactura}</span> | Proveedor: {cuenta.proveedor} | Monto: <span className="font-semibold">Bs {cuenta.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span> | Estatus: <span className="capitalize">{cuenta.estatus}</span>
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
