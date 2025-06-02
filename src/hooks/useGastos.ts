import { useEffect, useState, useCallback } from "react"; // Importa useCallback

interface Gasto {
  _id: string;
  monto: number;
  titulo: string;
  descripcion: string;
  localidad: string; // Este campo es el ID de la localidad
  fecha: string;
  estado: string;
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

  // Usa useCallback para memoizar la función fetchData.
  // Esto evita que fetchData se recree en cada render, lo cual es bueno para el rendimiento
  // y para evitar bucles infinitos si se usa en un useEffect sin dependencias adecuadas.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null); // Resetea el error en cada intento de fetch

    try {
      // 1. Fetch de Localidades (Farmacias)
      const resLocalidades = await fetch(`${API_BASE_URL}/farmacias`);
      if (!resLocalidades.ok) {
        throw new Error("Error al obtener localidades.");
      }
      const dataLocalidades = await resLocalidades.json();
      const listaLocalidades = dataLocalidades.farmacias
        ? Object.entries(dataLocalidades.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
        : Object.entries(dataLocalidades).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
      setLocalidades(listaLocalidades);

      // 2. Fetch de Gastos
      const resGastos = await fetch(`${API_BASE_URL}/gastos`);
      if (!resGastos.ok) {
        throw new Error("Error al obtener gastos.");
      }
      const dataGastos: Gasto[] = await resGastos.json();

      // Agrupar gastos por localidad (usando el campo 'localidad' del gasto)
      const agrupados = dataGastos.reduce((acc: Record<string, Gasto[]>, gasto: Gasto) => {
        if (!acc[gasto.localidad]) acc[gasto.localidad] = [];
        acc[gasto.localidad].push(gasto);
        return acc;
      }, {});
      setGastosPorLocalidad(agrupados);

    } catch (err: any) {
      console.error("Error al cargar los datos:", err);
      setError(err.message || "Error desconocido al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, []); // Dependencias vacías significa que esta función solo se crea una vez

  // Llama a fetchData una vez que el componente se monta para la carga inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]); // La dependencia es fetchData (la función memoizada)

  return { localidades, gastosPorLocalidad, loading, error, refreshGastos: fetchData };
}