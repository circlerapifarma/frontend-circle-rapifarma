import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ExistenciaPorFarmacia {
  farmacia: string;
  farmaciaNombre: string;
  existencia: number;
}

export interface ListaComparativa {
  _id: string;
  proveedorId: string;
  proveedor: {
    _id: string;
    nombreJuridico: string;
    descuentosComerciales: number;
  };
  codigo: string;
  descripcion: string;
  laboratorio: string;
  precio: number;
  descuento: number; // Porcentaje de descuento
  precioNeto: number; // Precio con descuento aplicado
  fechaVencimiento: string | null;
  existencia: number;
  miCosto: number | null;
  existencias: ExistenciaPorFarmacia[]; // Existencias por farmacia (del inventario)
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface Proveedor {
  _id: string;
  nombreJuridico: string;
  descuentosComerciales: number;
}

export function useListasComparativas() {
  const [listas, setListas] = useState<ListaComparativa[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener todos los proveedores
  const fetchProveedores = async () => {
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
    } catch (err: any) {
      setError(err.message || "Error al obtener proveedores");
    }
  };

  // Obtener todas las listas comparativas
  const fetchListas = async (filtros?: {
    codigo?: string;
    nombre?: string;
    laboratorio?: string;
    proveedorId?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const params = new URLSearchParams();
      if (filtros?.codigo) params.append("codigo", filtros.codigo);
      if (filtros?.nombre) params.append("nombre", filtros.nombre);
      if (filtros?.laboratorio) params.append("laboratorio", filtros.laboratorio);
      if (filtros?.proveedorId) params.append("proveedorId", filtros.proveedorId);

      const url = `${API_BASE_URL}/listas-comparativas${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al obtener listas comparativas");
      const data = await res.json();
      setListas(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener listas comparativas");
      setListas([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar listas
  const buscarListas = async (termino: string, filtros?: {
    codigo?: string;
    nombre?: string;
    laboratorio?: string;
    proveedorId?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const params = new URLSearchParams();
      if (termino) params.append("q", termino);
      if (filtros?.codigo) params.append("codigo", filtros.codigo);
      if (filtros?.nombre) params.append("nombre", filtros.nombre);
      if (filtros?.laboratorio) params.append("laboratorio", filtros.laboratorio);
      if (filtros?.proveedorId) params.append("proveedorId", filtros.proveedorId);

      const url = `${API_BASE_URL}/listas-comparativas/buscar${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al buscar listas comparativas");
      const data = await res.json();
      setListas(data);
    } catch (err: any) {
      setError(err.message || "Error al buscar listas comparativas");
      setListas([]);
    } finally {
      setLoading(false);
    }
  };

  // Subir lista de precios desde Excel
  const subirListaExcel = async (archivo: File, proveedorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
      const usuarioCorreo = usuario?.correo;
      if (!usuarioCorreo) throw new Error("No se encontró el correo del usuario");

      const formData = new FormData();
      formData.append("archivo", archivo);
      formData.append("proveedorId", proveedorId);
      formData.append("usuarioCorreo", usuarioCorreo);

      const res = await fetch(`${API_BASE_URL}/listas-comparativas/excel`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al subir archivo" }));
        throw new Error(errorData.detail || "Error al subir lista de precios");
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      setError(err.message || "Error al subir lista de precios");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar lista
  const eliminarLista = async (id: string) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const res = await fetch(`${API_BASE_URL}/listas-comparativas/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al eliminar" }));
        throw new Error(errorData.detail || "Error al eliminar lista");
      }

      await fetchListas(); // Refrescar lista
    } catch (err: any) {
      setError(err.message || "Error al eliminar lista");
      throw err;
    }
  };

  // Eliminar todas las listas de un proveedor
  const eliminarListasPorProveedor = async (proveedorId: string) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const res = await fetch(`${API_BASE_URL}/listas-comparativas/proveedor/${proveedorId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al eliminar" }));
        throw new Error(errorData.detail || "Error al eliminar listas del proveedor");
      }

      await fetchListas(); // Refrescar lista
    } catch (err: any) {
      setError(err.message || "Error al eliminar listas del proveedor");
      throw err;
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  return {
    listas,
    proveedores,
    loading,
    error,
    fetchListas,
    buscarListas,
    subirListaExcel,
    eliminarLista,
    eliminarListasPorProveedor,
    fetchProveedores,
  };
}

