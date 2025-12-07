import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

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
  precioAnterior?: number; // Precio anterior para comparación
  fechaVencimiento: string | null;
  existencia: number;
  miCosto: number | null;
  existencias: ExistenciaPorFarmacia[]; // Existencias por farmacia (del inventario)
  fechaCreacion: string;
  fechaActualizacion: string;
  esNuevo?: boolean; // Si es un producto nuevo (no estaba en lista anterior)
  cambioPrecio?: 'bajo' | 'subio' | 'igual'; // Cambio de precio respecto a lista anterior
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

  // Función para agregar listas temporalmente (procesadas localmente)
  const agregarListasTemporales = (nuevasListas: ListaComparativa[]) => {
    setListas(prevListas => [...nuevasListas, ...prevListas]);
  };

  // Obtener todos los proveedores (optimizado - solo si no están cargados)
  const fetchProveedores = async () => {
    // Evitar cargar si ya hay proveedores
    if (proveedores.length > 0) return;
    
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Agregar timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
      
      const res = await fetch(`${API_BASE_URL}/proveedores`, { 
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Error al obtener proveedores");
      const data = await res.json();
      setProveedores(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || "Error al obtener proveedores");
      }
    }
  };

  // Obtener todas las listas comparativas (optimizado)
  const fetchListas = async (filtros?: {
    codigo?: string;
    nombre?: string;
    laboratorio?: string;
    proveedorId?: string;
  }) => {
    // Evitar múltiples llamadas simultáneas
    if (loading) return;
    
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
      
      // Agregar timeout para evitar esperas infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
      
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Error al obtener listas comparativas");
      const data = await res.json();
      setListas(data);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("La solicitud tardó demasiado. Por favor, intente nuevamente.");
      } else {
        setError(err.message || "Error al obtener listas comparativas");
      }
      setListas([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar listas (optimizado)
  const buscarListas = async (termino: string, filtros?: {
    codigo?: string;
    nombre?: string;
    laboratorio?: string;
    proveedorId?: string;
  }) => {
    // Evitar múltiples llamadas simultáneas
    if (loading) return;
    
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
      
      // Agregar timeout para evitar esperas infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
      
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Error al buscar listas comparativas");
      const data = await res.json();
      setListas(data);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("La búsqueda tardó demasiado. Por favor, intente nuevamente.");
      } else {
        setError(err.message || "Error al buscar listas comparativas");
      }
      setListas([]);
    } finally {
      setLoading(false);
    }
  };

  // Procesar Excel localmente y devolver datos inmediatamente
  const procesarExcelLocal = async (
    archivo: File,
    proveedorId: string,
    proveedorNombre: string
  ): Promise<ListaComparativa[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            reject(new Error("El archivo Excel debe tener al menos una fila de datos"));
            return;
          }
          
          // Obtener headers (primera fila)
          const headers = (jsonData[0] || []).map((h: any) => String(h || "").toLowerCase().trim());
          
          // Buscar índices de columnas
          const codigoIdx = headers.findIndex(h => h.includes("codigo") || h.includes("código"));
          const descripcionIdx = headers.findIndex(h => h.includes("descripcion") || h.includes("descripción"));
          const laboratorioIdx = headers.findIndex(h => h.includes("laboratorio"));
          const precioIdx = headers.findIndex(h => h.includes("precio"));
          const descuentoIdx = headers.findIndex(h => h.includes("descuento"));
          const fechaVencIdx = headers.findIndex(h => h.includes("vencimiento") || h.includes("venc"));
          const existenciaIdx = headers.findIndex(h => h.includes("existencia"));
          
          if (codigoIdx === -1 || descripcionIdx === -1 || precioIdx === -1 || descuentoIdx === -1 || existenciaIdx === -1) {
            reject(new Error("El archivo Excel debe tener las columnas: CODIGO, DESCRIPCION, PRECIO, DESCUENTO, EXISTENCIA"));
            return;
          }
          
          // Obtener proveedor para descuento comercial
          const proveedor = proveedores.find(p => p._id === proveedorId);
          const descuentoComercial = proveedor?.descuentosComerciales || 0;
          
          // Procesar filas
          const listas: ListaComparativa[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const codigo = String(row[codigoIdx] || "").trim();
            const descripcion = String(row[descripcionIdx] || "").trim();
            
            if (!codigo || !descripcion) continue;
            
            const laboratorio = laboratorioIdx >= 0 ? String(row[laboratorioIdx] || "").trim() : "";
            const precio = parseFloat(row[precioIdx]) || 0;
            const descuento = parseFloat(row[descuentoIdx]) || 0;
            const existencia = parseInt(String(row[existenciaIdx] || 0)) || 0;
            
            // Parsear fecha
            let fechaVencimiento: string | null = null;
            if (fechaVencIdx >= 0 && row[fechaVencIdx]) {
              const fecha = row[fechaVencIdx];
              if (fecha instanceof Date) {
                fechaVencimiento = fecha.toISOString();
              } else if (typeof fecha === 'number') {
                // Excel serial date
                const excelDate = XLSX.SSF.parse_date_code(fecha);
                fechaVencimiento = new Date(excelDate.y, excelDate.m - 1, excelDate.d).toISOString();
              } else {
                try {
                  fechaVencimiento = new Date(String(fecha)).toISOString();
                } catch {
                  fechaVencimiento = null;
                }
              }
            }
            
            // Calcular precio neto
            const precioNeto = precio * (1 - descuento / 100) * (1 - descuentoComercial / 100);
            
            const lista: ListaComparativa = {
              _id: `temp_${Date.now()}_${i}`,
              proveedorId,
              proveedor: {
                _id: proveedorId,
                nombreJuridico: proveedorNombre,
                descuentosComerciales: descuentoComercial
              },
              codigo,
              descripcion,
              laboratorio,
              precio,
              descuento,
              precioNeto: Math.round(precioNeto * 100) / 100,
              fechaVencimiento,
              existencia,
              miCosto: null,
              existencias: [],
              fechaCreacion: new Date().toISOString(),
              fechaActualizacion: new Date().toISOString()
            };
            
            listas.push(lista);
          }
          
          resolve(listas);
        } catch (error: any) {
          reject(new Error(`Error al procesar Excel: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Error al leer el archivo Excel"));
      };
      
      reader.readAsBinaryString(archivo);
    });
  };

  // Subir lista de precios desde Excel con progreso (ahora en background)
  const subirListaExcel = async (
    archivo: File,
    proveedorId: string,
    onProgress?: (progress: number) => void
  ) => {
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

      // Usar XMLHttpRequest para monitorear el progreso
      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Monitorear progreso de carga
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (onProgress) onProgress(100);
              resolve(data);
            } catch (parseError) {
              reject(new Error("Error al procesar la respuesta del servidor"));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.detail || "Error al subir lista de precios"));
            } catch {
              reject(new Error(`Error al subir archivo: ${xhr.status} ${xhr.statusText}`));
            }
          }
          setLoading(false);
        };

        xhr.onerror = () => {
          reject(new Error("Error de red al subir el archivo"));
          setLoading(false);
        };

        xhr.onabort = () => {
          reject(new Error("Carga cancelada"));
          setLoading(false);
        };

        xhr.open("POST", `${API_BASE_URL}/listas-comparativas/excel`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (err: any) {
      setError(err.message || "Error al subir lista de precios");
      setLoading(false);
      throw err;
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

  // Cargar proveedores solo una vez al montar
  useEffect(() => {
    fetchProveedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo se ejecuta una vez

  return {
    listas,
    proveedores,
    loading,
    error,
    fetchListas,
    buscarListas,
    subirListaExcel,
    procesarExcelLocal,
    agregarListasTemporales,
    eliminarLista,
    eliminarListasPorProveedor,
    fetchProveedores,
  };
}

