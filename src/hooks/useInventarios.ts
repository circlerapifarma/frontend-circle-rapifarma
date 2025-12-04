import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface InventarioItem {
  _id: string;
  codigo: string;
  descripcion: string;
  laboratorio: string;
  costo: number;
  utilidad: number;
  precio: number;
  existencia: number;
  farmacia: string;
  usuarioCorreo?: string;
  fecha?: string;
  estado?: string;
}

export function useInventarios() {
  const [totalCantidad, setTotalCantidad] = useState<number>(0);
  const [totalSKU, setTotalSKU] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Obtener métricas de inventario (total cantidad y SKU)
  const fetchMetricasInventario = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/inventarios`, { headers });
      if (!res.ok) {
        setTotalCantidad(0);
        setTotalSKU(0);
        return;
      }
      
      const data: InventarioItem[] = await res.json();
      
      // Calcular total cantidad (suma de todas las existencias)
      const cantidadTotal = data.reduce((sum, item) => {
        return sum + (item.existencia || 0);
      }, 0);
      
      // Calcular SKU (número de productos únicos por código)
      const codigosUnicos = new Set(data.map(item => item.codigo?.toLowerCase().trim()).filter(Boolean));
      const sku = codigosUnicos.size;
      
      setTotalCantidad(cantidadTotal);
      setTotalSKU(sku);
    } catch (err) {
      // Silenciar errores para el contador del navbar
      setTotalCantidad(0);
      setTotalSKU(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricasInventario();
  }, []);

  return {
    totalCantidad,
    totalSKU,
    loading,
    fetchMetricasInventario,
  };
}

