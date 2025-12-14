import { useEffect, useState, useCallback } from "react";

interface Gasto {
  _id: string;
  monto: number;
  titulo: string;
  descripcion: string;
  localidad: string;
  fecha: string;
  fechaRegistro?: string;
  estado: string;
  divisa?: string;
  tasa?: number;
}

interface Localidad {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useGastos(localidadId?: string) {
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocalidades = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/farmacias`);
      if (!res.ok) throw new Error("Error al obtener localidades.");
      const data = await res.json();
      const lista = data.farmacias
        ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
        : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
      setLocalidades(lista);
    } catch {
      setLocalidades([]);
    }
  }, []);

  // --- /gastos (todos o por localidad)
  const fetchGastosAll = useCallback(async (locId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/gastos`;
      if (locId) url += `?localidad=${locId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al obtener gastos.");
      const data: Gasto[] = await res.json();
      setGastos(data);
    } catch (err: any) {
      setError(err.message || "Error desconocido al cargar los datos.");
      setGastos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- /gastos/estado (nuevo)
  const fetchGastosPorEstado = useCallback(
    async (estado?: string, locId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (estado) params.append("estado", estado);
        if (locId) params.append("localidad", locId);
        const url = `${API_BASE_URL}/gastos/estado?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Error al obtener gastos por estado.");
        const data: Gasto[] = await res.json();
        setGastos(data);
      } catch (err: any) {
        setError(err.message || "Error desconocido al cargar los datos.");
        setGastos([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // --- Actualización silenciosa sin mostrar loading
  const refreshGastosSilently = useCallback(
    async (estado?: string, locId?: string) => {
      try {
        const params = new URLSearchParams();
        if (estado) params.append("estado", estado);
        if (locId) params.append("localidad", locId);
        const url = `${API_BASE_URL}/gastos/estado?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Error al obtener gastos por estado.");
        const data: Gasto[] = await res.json();
        setGastos(data);
      } catch (err: any) {
        // Silenciosamente fallar, no actualizar el estado de error para no interrumpir
        console.error("Error al actualizar gastos silenciosamente:", err);
      }
    },
    []
  );

  // --- Remover un gasto del estado local (actualización optimista)
  const removeGasto = useCallback((gastoId: string) => {
    setGastos((prevGastos) => prevGastos.filter((gasto) => gasto._id !== gastoId));
  }, []);

  useEffect(() => {
    fetchLocalidades();
  }, [fetchLocalidades, fetchGastosAll, localidadId]);

  return {
    localidades,
    gastos,
    loading,
    error,
    fetchGastosAll,
    fetchGastosPorEstado,
    refreshGastos: fetchGastosAll,
    refreshGastosSilently,
    removeGasto,
  };
}
