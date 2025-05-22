import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CuadreCaja {
  dia: string;
  cajaNumero: number;
  tasa: number;
  turno: string;
  cajero: string;
  totalCajaSistemaBs: number;
  devolucionesBs: number;
  recargaBs: number;
  pagomovilBs: number;
  puntosVenta?: Array<{ banco: string; puntoDebito: number; puntoCredito: number }>;
  efectivoBs: number;
  totalBs: number;
  totalBsEnUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  totalGeneralUsd: number;
  diferenciaUsd: number;
  sobranteUsd?: number;
  faltanteUsd?: number;
  delete: boolean;
  estado?: string;
  nombreFarmacia?: string;
}

const VerificacionCuadresPage: React.FC = () => {
  const [cuadres, setCuadres] = useState<CuadreCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCuadres = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/cuadres/all");
        const data = await res.json();
        // Filtrar solo los cuadres que no estén verificados ni denegados
        const pendientes = data.filter((c: CuadreCaja) => c.estado !== "verified" && c.estado !== "denied");
        setCuadres(pendientes);
      } catch (err) {
        setError("Error al cargar cuadres");
      } finally {
        setLoading(false);
      }
    };
    fetchCuadres();
  }, []);

  const actualizarEstado = async (cuadre: CuadreCaja, nuevoEstado: "verified" | "denied") => {
    try {
      const res = await fetch(`http://localhost:8000/cuadres/${cuadre.nombreFarmacia}/${cuadre.dia}/${cuadre.cajaNumero}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      setCuadres(prev => prev.filter(c => !(c.dia === cuadre.dia && c.cajaNumero === cuadre.cajaNumero && c.nombreFarmacia === cuadre.nombreFarmacia)));
    } catch {
      alert("No se pudo actualizar el estado del cuadre");
    }
  };

  if (loading) return <div className="text-center py-10">Cargando...</div>;
  if (error) return <div className="text-center text-red-600 py-10">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-900 mb-6 text-center">Verificación de Cuadres</h1>
        {cuadres.length === 0 ? (
          <div className="text-center text-gray-500">No hay cuadres pendientes de verificación.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cuadres.map((c, idx) => (
              <Card key={idx} className="p-4 flex flex-col gap-2">
                <div className="font-bold text-blue-700 text-lg mb-1">{c.nombreFarmacia || "Farmacia"}</div>
                <div className="text-sm text-gray-700">Día: <span className="font-semibold">{c.dia}</span></div>
                <div className="text-sm">Caja: <span className="font-semibold">{c.cajaNumero}</span> | Turno: <span className="font-semibold">{c.turno}</span></div>
                <div className="text-sm">Cajero: <span className="font-semibold">{c.cajero}</span></div>
                <div className="text-xs text-gray-500">Estado actual: <span className="font-bold">{c.estado}</span></div>
                <div className="flex gap-2 mt-2">
                  <Button variant="success" onClick={() => actualizarEstado(c, "verified")}>Verificar</Button>
                  <Button variant="destructive" onClick={() => actualizarEstado(c, "denied")}>Denegar</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificacionCuadresPage;
