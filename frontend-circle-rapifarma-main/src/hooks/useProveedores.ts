import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Proveedor {
  _id?: string;
  nombreJuridico: string;
  rif: string;
  direccion: string;
  numeroTelefono: string;
  diasCredito: number;
  descuentosComerciales: number; // Porcentaje
  descuentosProntoPago: number; // Porcentaje
}

export function useProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProveedores, setTotalProveedores] = useState<number>(0);

  // Obtener todos los proveedores
  const fetchProveedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/proveedores`, { headers });
      if (!res.ok) throw new Error("Error al obtener proveedores");
      const data = await res.json();
      setProveedores(data);
      setTotalProveedores(data.length);
    } catch (err: any) {
      setError(err.message || "Error al obtener proveedores");
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  // Crear proveedor
  const crearProveedor = async (proveedor: Proveedor) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/proveedores`, {
        method: "POST",
        headers,
        body: JSON.stringify(proveedor),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al crear proveedor");
      }
      const nuevoProveedor = await res.json();
      await fetchProveedores(); // Refrescar lista
      return nuevoProveedor;
    } catch (err: any) {
      setError(err.message || "Error al crear proveedor");
      throw err;
    }
  };

  // Actualizar proveedor
  const actualizarProveedor = async (id: string, proveedor: Partial<Proveedor>) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/proveedores/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(proveedor),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al actualizar proveedor");
      }
      const proveedorActualizado = await res.json();
      await fetchProveedores(); // Refrescar lista
      return proveedorActualizado;
    } catch (err: any) {
      setError(err.message || "Error al actualizar proveedor");
      throw err;
    }
  };

  // Eliminar proveedor
  const eliminarProveedor = async (id: string) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/proveedores/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al eliminar proveedor");
      }
      await fetchProveedores(); // Refrescar lista
    } catch (err: any) {
      setError(err.message || "Error al eliminar proveedor");
      throw err;
    }
  };

  // Obtener solo el total de proveedores (para el navbar)
  const fetchTotalProveedores = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/proveedores`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setTotalProveedores(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      // Silenciar errores para el contador del navbar
      setTotalProveedores(0);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  return {
    proveedores,
    loading,
    error,
    totalProveedores,
    fetchProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    fetchTotalProveedores,
  };
}


