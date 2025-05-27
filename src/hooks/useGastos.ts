import { useEffect, useState } from "react";

interface Gasto {
  _id: string; // Updated from id to _id
  monto: number;
  titulo: string;
  descripcion: string;
  localidad: string;
  fecha: string;
  estado: string; // Added estado field
}

interface Localidad {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useGastos() {
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [gastosPorLocalidad, setGastosPorLocalidad] = useState<Record<string, Gasto[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocalidades = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/farmacias`);
        if (!res.ok) {
          throw new Error("Error al obtener localidades");
        }
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setLocalidades(lista);
      } catch (error: any) {
        console.error("Error al obtener localidades:", error);
        setError(error.message || "Error desconocido al obtener localidades");
      } finally {
        setLoading(false);
      }
    };

    fetchLocalidades();
  }, []);

  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/gastos`);
        if (!res.ok) {
          throw new Error("Error al obtener gastos");
        }
        const data = await res.json();
        const agrupados = data.reduce((acc: Record<string, Gasto[]>, gasto: Gasto) => {
          if (!acc[gasto.localidad]) acc[gasto.localidad] = [];
          acc[gasto.localidad].push(gasto);
          return acc;
        }, {});
        setGastosPorLocalidad(agrupados);
      } catch (error: any) {
        console.error("Error al obtener gastos:", error);
        setError(error.message || "Error desconocido al obtener gastos");
      }
    };

    fetchGastos();
  }, []);

  return { localidades, gastosPorLocalidad, loading, error };
}
