import React, { useState, useEffect, useMemo } from "react";
import { useListasComparativas, type ListaComparativa, type ExistenciaPorFarmacia } from "@/hooks/useListasComparativas";
import { useProveedores } from "@/hooks/useProveedores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Upload, Trash2, FileSpreadsheet, ChevronDown, ChevronRight, ShoppingCart, X, FileDown, FileText, Info, RefreshCw } from "lucide-react";
import { useOrdenCompra } from "@/hooks/useOrdenCompra";

const ListasComparativasPage: React.FC = () => {
  const {
    listas,
    proveedores: proveedoresConListas,
    loading,
    error,
    fetchListas,
    buscarListas,
    subirListaExcel,
    procesarExcelLocal,
    agregarListasTemporales,
    eliminarLista,
    eliminarListasPorProveedor,
    subirListaPorLotes,
  } = useListasComparativas();

  // Obtener todos los proveedores registrados
  const { proveedores: todosLosProveedores } = useProveedores();
  
  // Usar proveedoresConListas como proveedores para el filtro
  const proveedores = proveedoresConListas;

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
  const [filtroCostoPorEncima, setFiltroCostoPorEncima] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCarritoModal, setShowCarritoModal] = useState(false);
  const [showAgregarCarritoModal, setShowAgregarCarritoModal] = useState(false);
  const [productoParaAgregar, setProductoParaAgregar] = useState<ListaComparativa | null>(null);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState("");
  const [cantidadAgregar, setCantidadAgregar] = useState(1);

  const {
    ordenCompra,
    ordenCompraPorFarmacia,
    farmacias,
    agregarProducto,
    eliminarProducto,
    actualizarCantidad,
    limpiarCarrito,
    exportarExcelPorFarmacia,
    exportarPDFPorFarmacia,
    exportarTodasFarmaciasExcel,
    totalItems,
    totalGeneral,
  } = useOrdenCompra();
  const [selectedProveedor, setSelectedProveedor] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id?: string;
    proveedorId?: string;
    proveedorNombre?: string;
  }>({ open: false });
  const [showDeleteProveedorModal, setShowDeleteProveedorModal] = useState(false);
  const [proveedorParaBorrar, setProveedorParaBorrar] = useState("");
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [productoDetalles, setProductoDetalles] = useState<{
    descripcion: string;
    codigo: string;
    laboratorio: string;
    todosLosPrecios: ListaComparativa[];
  } | null>(null);

  // Pre-calcular datos procesados del modal para evitar cálculos en cada render
  const listasProcesadasModal = useMemo(() => {
    if (!productoDetalles) return [];
    
    return productoDetalles.todosLosPrecios.map((lista) => {
      const existenciasConCosto = lista.existencias?.filter(e => e.costo !== undefined && e.costo !== null && e.existencia > 0) || [];
      const totalExistencia = lista.existencias?.reduce((sum, e) => sum + e.existencia, 0) || 0;
      const totalCosto = existenciasConCosto.reduce((sum, e) => sum + (e.costo! * e.existencia), 0);
      const costoPromedioPonderado = existenciasConCosto.length > 0 && totalExistencia > 0 
        ? totalCosto / totalExistencia 
        : null;
      
      return {
        ...lista,
        totalExistencia,
        costoPromedioPonderado,
        tieneCostos: existenciasConCosto.length > 0
      };
    });
  }, [productoDetalles]);

  // Cargar datos iniciales solo una vez
  useEffect(() => {
    let mounted = true;
    
    const cargarDatos = async () => {
      // Verificar token antes de cargar
      const token = localStorage.getItem("token");
      if (!token) {
        // El error se mostrará automáticamente cuando fetchListas falle
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }
      
      try {
        // Cargar listas (fetchListas ya maneja el caché internamente)
        await fetchListas();
      } catch (err: any) {
        console.error("Error al cargar datos iniciales:", err);
        // El error ya se maneja en fetchListas y se muestra en el estado 'error'
      }
    };
    
    if (mounted) {
      cargarDatos();
    }
    
    return () => {
      mounted = false;
    };
  }, []); // Solo se ejecuta una vez al montar

  // Búsqueda con debounce (solo si no es la carga inicial)
  useEffect(() => {
    // Evitar ejecutar en la carga inicial (ya se maneja arriba)
    if (!searchTerm && !filtroProveedor) return;
    
    const timeoutId = setTimeout(() => {
      if (searchTerm || filtroProveedor) {
        buscarListas(searchTerm, {
          proveedorId: filtroProveedor || undefined,
        });
      } else {
        fetchListas({
          proveedorId: filtroProveedor || undefined,
        });
      }
    }, 300); // Debounce de 300ms para reducir llamadas al servidor

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filtroProveedor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'xlsx' && extension !== 'xls') {
        setUploadError("Por favor, selecciona un archivo Excel (.xlsx o .xls)");
        return;
      }
      setExcelFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!excelFile || !selectedProveedor) {
      setUploadError("Por favor, selecciona un proveedor y un archivo Excel");
      return;
    }

    // Verificar token ANTES de empezar
    const token = localStorage.getItem("token");
    if (!token) {
      setUploadError("No se encontró el token de autenticación. Por favor, inicie sesión nuevamente.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setIsProcessing(false);
    setUploadError(null);
    setUploadSuccess(false);

    // Guardar referencia al archivo antes de cualquier operación
    const archivoParaSubir = excelFile;
    const proveedorIdParaSubir = selectedProveedor;

    try {
      // 1. Procesar Excel localmente (rápido, muestra datos inmediatamente)
      const proveedor = proveedores.find(p => p._id === selectedProveedor);
      const proveedorNombre = proveedor?.nombreJuridico || "Proveedor";
      
      setUploadProgress(10);
      setIsProcessing(true);
      
      const listasLocales = await procesarExcelLocal(archivoParaSubir, proveedorIdParaSubir, proveedorNombre);
      
      // 2. Agregar listas procesadas localmente al estado (muestra inmediatamente)
      agregarListasTemporales(listasLocales);
      
      setUploadProgress(30);
      setIsProcessing(true); // Cambiar a "Subiendo al servidor..."
      
      // 3. Verificar token nuevamente antes de subir
      const tokenAntesDeSubir = localStorage.getItem("token");
      if (!tokenAntesDeSubir) {
        setUploadError("Su sesión expiró durante el procesamiento. Por favor, inicie sesión nuevamente.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        setIsProcessing(false);
        setUploadProgress(0);
        setUploading(false);
        return;
      }
      
      // 4. Verificar tamaño del archivo para decidir método de subida
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      const esArchivoGrande = archivoParaSubir.size > MAX_SIZE;
      
      // 5. Subir al backend (esperar a que termine antes de cerrar)
      try {
        if (esArchivoGrande) {
          // Archivo grande: ya está procesado localmente, usar /batch directamente
          await subirListaPorLotes(listasLocales, proveedorIdParaSubir, (progress) => {
            // Progreso: 30% (procesado) + 70% (subida por lotes)
            const progresoTotal = 30 + Math.round((progress / 100) * 70);
            setUploadProgress(progresoTotal);
          });
        } else {
          // Archivo pequeño: subir directamente usando /excel
          await subirListaExcel(archivoParaSubir, proveedorIdParaSubir, (progress) => {
            // Actualizar progreso: 30% (procesado) + 70% (subida)
            const progresoTotal = 30 + Math.round((progress / 100) * 70);
            setUploadProgress(progresoTotal);
          });
        }
        
        // 5. Subida exitosa - esperar un momento para que el backend termine de procesar
        setUploadProgress(100);
        setUploadSuccess(true);
        setIsProcessing(false);
        
        // Guardar el número de items antes de refrescar
        const itemsAntes = listas.length;
        console.log(`📊 Items antes de subir: ${itemsAntes}`);
        
        // Esperar un momento para mostrar el éxito y dar tiempo al backend
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Limpiar filtros para mostrar todas las listas
        setSearchTerm("");
        setFiltroProveedor("");
        
        // Refrescar lista desde el servidor (sin filtros) - hacer múltiples intentos
        let intentos = 0;
        const maxIntentos = 3; // Reducir a 3 intentos
        
        while (intentos < maxIntentos) {
          await fetchListas();
          
          // Esperar un momento antes de verificar
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Obtener el número actual de items después de que el estado se actualice
          // Nota: listas.length puede no estar actualizado inmediatamente, así que
          // simplemente hacemos los refrescos y confiamos en que el backend guardó correctamente
          intentos++;
          console.log(`📊 Intento ${intentos}/${maxIntentos} de refresco completado`);
        }
        
        // Verificar si las listas se actualizaron después de todos los intentos
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar un momento más
        const itemsDespues = listas.length;
        
        if (itemsDespues <= itemsAntes) {
          console.warn(`⚠️ Después de ${maxIntentos} intentos, las listas no se actualizaron (${itemsAntes} → ${itemsDespues} items). Esto indica que el backend NO guardó los items.`);
          // No mostrar error aquí porque ya se mostró arriba si el backend reportó 0 insertados
        } else {
          console.log(`✅ Listas actualizadas correctamente: ${itemsAntes} → ${itemsDespues} items`);
        }
        
        // Cerrar modal y limpiar
        setExcelFile(null);
        setSelectedProveedor("");
        setShowUploadModal(false);
        setUploadSuccess(false);
        setUploadProgress(0);
        setUploading(false);
        
      } catch (uploadError: any) {
        // Error al subir al servidor
        console.error("Error al subir al servidor:", uploadError);
        
        // Si el error es de autenticación, redirigir
        if (uploadError.message && (uploadError.message.includes("token") || uploadError.message.includes("sesión") || uploadError.message.includes("autenticación"))) {
          setUploadError("Su sesión expiró. Por favor, inicie sesión nuevamente.");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } else {
          // Si el error indica que el backend no guardó items, mostrar mensaje más claro
          let mensajeError = uploadError.message || 
            "Error al guardar en el servidor. Los datos están visibles localmente pero no se guardaron. Por favor, intente nuevamente.";
          
          if (uploadError.message?.includes("NO guardó ninguno") || 
              uploadError.message?.includes("0 insertados, 0 actualizados") ||
              uploadError.message?.includes("ERROR CRÍTICO")) {
            mensajeError = `🚨 ERROR CRÍTICO DEL BACKEND: El servidor procesó el archivo Excel pero NO guardó los items en la base de datos (0 insertados, 0 actualizados). Esto es un problema del backend que debe ser corregido. Los datos procesados localmente se mostrarán temporalmente pero se perderán al refrescar la página. Por favor, contacta al administrador del sistema o revisa el documento INSTRUCCIONES_BACKEND_LISTAS_COMPARATIVAS_INSERCION.md.`;
          }
          
          setUploadError(mensajeError);
        }
        setIsProcessing(false);
        setUploadProgress(0);
        // NO cerrar el modal para que el usuario vea el error
        setUploading(false);
      }
      
    } catch (err: any) {
      setIsProcessing(false);
      setUploadError(err.message || "Error al procesar el archivo");
      setUploadProgress(0);
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleAgregarCarrito = (lista: ListaComparativa) => {
    setProductoParaAgregar(lista);
    setFarmaciaSeleccionada("");
    setCantidadAgregar(1);
    setShowAgregarCarritoModal(true);
  };

  const confirmarAgregarCarrito = () => {
    if (!productoParaAgregar || !farmaciaSeleccionada) {
      return;
    }
    
    const farmacia = farmacias.find(f => f.id === farmaciaSeleccionada);
    if (farmacia) {
      agregarProducto(productoParaAgregar, farmaciaSeleccionada, farmacia.nombre, cantidadAgregar);
      setShowAgregarCarritoModal(false);
      setProductoParaAgregar(null);
      setFarmaciaSeleccionada("");
      setCantidadAgregar(1);
    }
  };

  const confirmDelete = async () => {
    try {
      if (deleteConfirm.id) {
        await eliminarLista(deleteConfirm.id);
      } else if (deleteConfirm.proveedorId) {
        await eliminarListasPorProveedor(deleteConfirm.proveedorId);
      }
      setDeleteConfirm({ open: false });
      fetchListas();
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Función para calcular estadísticas
  // Función para generar un color único y consistente para cada proveedor
  const obtenerColorProveedor = (proveedorId: string | undefined): { bg: string; text: string; border: string } => {
    if (!proveedorId) {
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
    }

    // Paleta de colores suaves y distinguibles
    const colores = [
      { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
      { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
      { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
      { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
      { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
      { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
      { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
      { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
      { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300' },
      { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
      { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
      { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
    ];

    // Generar un hash simple del ID del proveedor
    let hash = 0;
    for (let i = 0; i < proveedorId.length; i++) {
      hash = proveedorId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Usar el hash para seleccionar un color de la paleta
    const index = Math.abs(hash) % colores.length;
    return colores[index];
  };

  const calcularEstadisticas = (listas: ListaComparativa[], totalProveedoresRegistrados: number) => {
    // Proveedores que tienen listas cargadas (no el total de items)
    const proveedoresConListas = new Set(listas.map(l => l.proveedorId));
    const skuNuevos = listas.filter(l => l.esNuevo === true).length;
    const productosOferta = listas.filter(l => l.cambioPrecio === 'bajo').length;
    const productosSubieron = listas.filter(l => l.cambioPrecio === 'subio').length;
    
    return {
      numeroProveedores: totalProveedoresRegistrados, // Total de proveedores registrados
      numeroListas: proveedoresConListas.size, // Cantidad de proveedores con listas cargadas
      skuNuevos,
      productosOferta,
      productosSubieron,
    };
  };

  // Función para determinar color según estado del producto
  const obtenerColorProducto = (lista: ListaComparativa) => {
    // Azul: Producto nuevo
    if (lista.esNuevo) {
      return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500';
    }
    
    // Calcular existencia total en mis farmacias
    const existenciaTotal = lista.existencias?.reduce((sum, e) => sum + e.existencia, 0) || 0;
    
    // Verde: Poca o cero existencia (0-10)
    if (existenciaTotal <= 10) {
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500';
    }
    
    // Rojo: Mucha existencia (>100)
    if (existenciaTotal > 100) {
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500';
    }
    
    return '';
  };

  // Función para determinar color del costo
  const obtenerColorCosto = (miCosto: number | null, precioNeto: number) => {
    if (!miCosto) return '';
    
    const diferencia = ((miCosto - precioNeto) / precioNeto) * 100;
    
    // Si mi costo está por encima del precio de la lista (>10% más caro)
    if (diferencia > 10) {
      return 'text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded';
    }
    
    // Si mi costo está muy por debajo del precio de la lista (>20% más barato)
    if (diferencia < -20) {
      return 'text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded';
    }
    
    return '';
  };

  // Función para agrupar productos (agrupa por código normalizado, mostrando el mejor precio)
  const agruparProductos = (listas: ListaComparativa[]) => {
    // Validar que listas es un array
    if (!listas || !Array.isArray(listas)) {
      return [];
    }
    
    const grupos = new Map<string, ListaComparativa[]>();
    
    listas.forEach((lista: ListaComparativa) => {
      // Normalizar código: eliminar espacios, guiones y otros caracteres especiales
      // Esto permite agrupar productos con el mismo código aunque tenga formato diferente
      const codigoNormalizado = (lista.codigo || "")
        .toString()
        .replace(/\s+/g, '') // Eliminar espacios
        .replace(/[-\/]/g, '') // Eliminar guiones y barras
        .toLowerCase()
        .trim();
      
      // Si el código está vacío, usar descripción + laboratorio como fallback
      const clave = codigoNormalizado || `${(lista.descripcion || "").toLowerCase().trim()}|${(lista.laboratorio || "").toLowerCase().trim()}`;
      
      if (!grupos.has(clave)) {
        grupos.set(clave, []);
      }
      grupos.get(clave)!.push(lista);
    });
    
    // Convertir a array y ordenar cada grupo por precio neto (mejor precio primero)
    return Array.from(grupos.entries()).map(([clave, items]) => {
      // Ordenar por precio neto (mejor precio primero)
      const sorted = [...items].sort((a, b) => a.precioNeto - b.precioNeto);
      const mejorPrecio = sorted[0];
      
      // Calcular existencia total: sumar todas las existencias de todas las farmacias de todos los productos del grupo
      const existenciasPorFarmacia = new Map<string, number>();
      
      sorted.forEach((item) => {
        if (item.existencias && Array.isArray(item.existencias)) {
          item.existencias.forEach((exist: ExistenciaPorFarmacia) => {
            const farmaciaKey = exist.farmacia;
            const existenciaActual = existenciasPorFarmacia.get(farmaciaKey) || 0;
            existenciasPorFarmacia.set(farmaciaKey, existenciaActual + exist.existencia);
          });
        }
      });
      
      const existenciaTotal = Array.from(existenciasPorFarmacia.values()).reduce((sum, exist) => sum + exist, 0);
      
      // Obtener el mejor costo (el más bajo, si existe)
      const mejoresCostos = sorted
        .map(item => item.miCosto)
        .filter(costo => costo !== null && costo !== undefined) as number[];
      const mejorCosto = mejoresCostos.length > 0 ? Math.min(...mejoresCostos) : null;
      
      return {
        clave,
        mejorPrecio,
        todosLosPrecios: sorted,
        cantidadOpciones: sorted.length,
        existenciaTotal,
        mejorCosto,
      };
    });
  };

  const toggleExpand = (clave: string) => {
    setExpandedProducts(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(clave)) {
        nuevo.delete(clave);
      } else {
        nuevo.add(clave);
      }
      return nuevo;
    });
  };

  // Calcular productos agrupados y estadísticas
  const productosAgrupados = agruparProductos(listas);
  const estadisticas = calcularEstadisticas(listas, todosLosProveedores.length);
  
  // Aplicar filtros locales a productosAgrupados (después de agrupar)
  const productosAgrupadosFiltrados = productosAgrupados.filter((grupo) => {
    const { mejorPrecio, mejorCosto } = grupo;
    
    // Filtro por término de búsqueda
    if (searchTerm) {
      const termino = searchTerm.toLowerCase();
      const coincideCodigo = mejorPrecio.codigo?.toLowerCase().includes(termino);
      const coincideDescripcion = mejorPrecio.descripcion?.toLowerCase().includes(termino);
      const coincideLaboratorio = mejorPrecio.laboratorio?.toLowerCase().includes(termino);
      
      if (!coincideCodigo && !coincideDescripcion && !coincideLaboratorio) {
        return false;
      }
    }
    
    // Filtro por proveedor
    if (filtroProveedor) {
      if (mejorPrecio.proveedorId !== filtroProveedor) {
        return false;
      }
    }
    
    // Filtro: Solo productos donde mi costo está por encima del precio del proveedor
    if (filtroCostoPorEncima) {
      // Verificar si hay algún costo en el grupo que esté por encima del precio
      const tieneCostoPorEncima = grupo.todosLosPrecios.some((lista) => {
        if (lista.miCosto && lista.precioNeto) {
          return lista.miCosto > lista.precioNeto;
        }
        return false;
      });
      
      // También verificar el mejorCosto del grupo
      if (!tieneCostoPorEncima && mejorCosto && mejorPrecio.precioNeto) {
        if (mejorCosto <= mejorPrecio.precioNeto) {
          return false;
        }
      } else if (!tieneCostoPorEncima) {
        return false;
      }
    }
    
    return true;
  });
  
  // Debug: Log para verificar que las listas se están cargando
  useEffect(() => {
    if (listas.length > 0) {
      console.log(`✅ Listas cargadas: ${listas.length} items`);
      console.log(`✅ Productos agrupados: ${productosAgrupados.length} grupos`);
      console.log(`✅ Productos filtrados: ${productosAgrupadosFiltrados.length} grupos`);
      console.log(`✅ Filtros activos - searchTerm: "${searchTerm}", filtroProveedor: "${filtroProveedor}"`);
    } else if (!loading) {
      console.log("⚠️ No hay listas cargadas");
    }
  }, [listas, productosAgrupados.length, productosAgrupadosFiltrados.length, searchTerm, filtroProveedor, loading]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Navbar con estadísticas */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Listas Comparativas</h1>
            {/* Leyenda de colores de proveedores */}
            {proveedores.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <span className="text-xs text-gray-600 font-semibold mr-2">Proveedores:</span>
                {proveedores.slice(0, 8).map((prov) => {
                  const colorProveedor = obtenerColorProveedor(prov._id);
                  return (
                    <div
                      key={prov._id}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs ${colorProveedor.bg} ${colorProveedor.text} ${colorProveedor.border}`}
                      title={prov.nombreJuridico}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ 
                        backgroundColor: colorProveedor.bg.includes('blue') ? '#3b82f6' :
                                        colorProveedor.bg.includes('green') ? '#10b981' :
                                        colorProveedor.bg.includes('yellow') ? '#eab308' :
                                        colorProveedor.bg.includes('purple') ? '#a855f7' :
                                        colorProveedor.bg.includes('pink') ? '#ec4899' :
                                        colorProveedor.bg.includes('indigo') ? '#6366f1' :
                                        colorProveedor.bg.includes('red') ? '#ef4444' :
                                        colorProveedor.bg.includes('teal') ? '#14b8a6' :
                                        colorProveedor.bg.includes('orange') ? '#f97316' :
                                        colorProveedor.bg.includes('cyan') ? '#06b6d4' :
                                        colorProveedor.bg.includes('amber') ? '#f59e0b' :
                                        colorProveedor.bg.includes('lime') ? '#84cc16' :
                                        colorProveedor.bg.includes('emerald') ? '#10b981' :
                                        colorProveedor.bg.includes('violet') ? '#8b5cf6' :
                                        colorProveedor.bg.includes('rose') ? '#f43f5e' : '#6b7280'
                      }}></div>
                      <span className="truncate max-w-[100px]">{prov.nombreJuridico}</span>
                    </div>
                  );
                })}
                {proveedores.length > 8 && (
                  <span className="text-xs text-gray-500">+{proveedores.length - 8} más</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setFiltroProveedor("");
                setFiltroCostoPorEncima(false);
                fetchListas();
              }}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
              title="Refrescar listas"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refrescar
            </Button>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Lista de Precios
            </Button>
          </div>
        </div>
        
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Proveedores</p>
            <p className="text-2xl font-bold text-blue-600">{estadisticas.numeroProveedores}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">Listas Cargadas</p>
            <p className="text-2xl font-bold text-purple-600">{estadisticas.numeroListas}</p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
            <p className="text-sm text-gray-600 mb-1">SKU Nuevas</p>
            <p className="text-2xl font-bold text-cyan-600">{estadisticas.skuNuevos}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">En Oferta</p>
            <p className="text-2xl font-bold text-green-600">{estadisticas.productosOferta}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Subieron Precio</p>
            <p className="text-2xl font-bold text-red-600">{estadisticas.productosSubieron}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filtros de búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar por código, nombre o laboratorio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div>
            <select
              className="w-full border rounded px-3 py-2"
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map((prov) => (
                <option key={prov._id} value={prov._id}>
                  {prov.nombreJuridico}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 w-full">
              <input
                type="checkbox"
                checked={filtroCostoPorEncima}
                onChange={(e) => setFiltroCostoPorEncima(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">
                ⚠️ Mi costo por encima del proveedor
              </span>
            </label>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => setShowDeleteProveedorModal(true)}
              className="w-full text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar Listas por Proveedor
            </Button>
          </div>
        </div>
        {filtroCostoPorEncima && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Filtro activo:</strong> Mostrando solo productos donde tu costo es mayor que el precio del proveedor
          </div>
        )}
      </div>

      {/* Tabla de listas comparativas */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p>Cargando listas comparativas...</p>
        </div>
      ) : productosAgrupados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {listas.length === 0 ? (
            <div>
              <p className="mb-2">No hay listas de precios disponibles.</p>
              <p>Sube una lista de precios para comenzar.</p>
            </div>
          ) : (
            <div>
              <p className="mb-2">No se encontraron productos que coincidan con los filtros aplicados.</p>
              <p className="text-sm mb-4">Total de listas cargadas: {listas.length}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFiltroProveedor("");
                  setFiltroCostoPorEncima(false);
                  fetchListas();
                }}
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpiar Filtros y Refrescar
              </Button>
            </div>
          )}
        </div>
      ) : productosAgrupadosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No se encontraron productos que coincidan con los filtros aplicados.</p>
          <p className="text-sm mb-4">Total de productos: {productosAgrupados.length}</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setFiltroProveedor("");
              setFiltroCostoPorEncima(false);
            }}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Limpiar Filtros
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Laboratorio</TableHead>
                  <TableHead>Mejor Precio</TableHead>
                  <TableHead>Proveedor (Mejor)</TableHead>
                  <TableHead>Mi Costo</TableHead>
                  <TableHead>Existencia (Proveedor)</TableHead>
                  <TableHead>Opciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosAgrupadosFiltrados.map((grupo) => {
                  const isExpanded = expandedProducts.has(grupo.clave);
                  const { mejorPrecio, todosLosPrecios, cantidadOpciones, mejorCosto } = grupo;
                  
                  return (
                    <React.Fragment key={grupo.clave}>
                      {/* Fila principal con el mejor precio */}
                      <TableRow className={obtenerColorProducto(mejorPrecio)}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(grupo.clave)}
                            className="p-0 h-8 w-8"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{mejorPrecio.codigo || "N/A"}</TableCell>
                        <TableCell className="font-semibold">{mejorPrecio.descripcion}</TableCell>
                        <TableCell>{mejorPrecio.laboratorio || "N/A"}</TableCell>
                        <TableCell className="font-bold text-green-700 text-lg">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{formatCurrency(mejorPrecio.precioNeto)}</span>
                              {mejorPrecio.precioAnterior && mejorPrecio.precioAnterior !== mejorPrecio.precioNeto && (
                                <span className={`text-xs font-semibold ${mejorPrecio.precioNeto < mejorPrecio.precioAnterior ? 'text-green-600' : 'text-red-600'}`}>
                                  ({mejorPrecio.precioNeto < mejorPrecio.precioAnterior ? '↓' : '↑'} {formatCurrency(mejorPrecio.precioAnterior)})
                                </span>
                              )}
                            </div>
                            {cantidadOpciones > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Usar requestAnimationFrame para mejor rendimiento
                                  requestAnimationFrame(() => {
                                    setProductoDetalles({
                                      descripcion: mejorPrecio.descripcion,
                                      codigo: mejorPrecio.codigo || "N/A",
                                      laboratorio: mejorPrecio.laboratorio || "N/A",
                                      todosLosPrecios: todosLosPrecios
                                    });
                                    // Abrir modal en el siguiente frame
                                    requestAnimationFrame(() => {
                                      setShowDetallesModal(true);
                                    });
                                  });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 border-blue-300 hover:bg-blue-50 w-fit"
                              >
                                <Info className="w-3 h-3 mr-1" />
                                Ver Precios de {cantidadOpciones} Proveedores
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const colorProveedor = obtenerColorProveedor(mejorPrecio.proveedorId);
                            return (
                              <div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${colorProveedor.bg} ${colorProveedor.text} ${colorProveedor.border}`}>
                                  <div className={`w-3 h-3 rounded-full ${colorProveedor.bg.replace('bg-', 'bg-').split('-')[0] === 'bg' ? colorProveedor.bg : colorProveedor.bg}`} style={{ 
                                    backgroundColor: colorProveedor.bg.includes('blue') ? '#3b82f6' :
                                                    colorProveedor.bg.includes('green') ? '#10b981' :
                                                    colorProveedor.bg.includes('yellow') ? '#eab308' :
                                                    colorProveedor.bg.includes('purple') ? '#a855f7' :
                                                    colorProveedor.bg.includes('pink') ? '#ec4899' :
                                                    colorProveedor.bg.includes('indigo') ? '#6366f1' :
                                                    colorProveedor.bg.includes('red') ? '#ef4444' :
                                                    colorProveedor.bg.includes('teal') ? '#14b8a6' :
                                                    colorProveedor.bg.includes('orange') ? '#f97316' :
                                                    colorProveedor.bg.includes('cyan') ? '#06b6d4' :
                                                    colorProveedor.bg.includes('amber') ? '#f59e0b' :
                                                    colorProveedor.bg.includes('lime') ? '#84cc16' :
                                                    colorProveedor.bg.includes('emerald') ? '#10b981' :
                                                    colorProveedor.bg.includes('violet') ? '#8b5cf6' :
                                                    colorProveedor.bg.includes('rose') ? '#f43f5e' : '#6b7280'
                                  }}></div>
                                  <div className="font-medium">{mejorPrecio.proveedor?.nombreJuridico || "N/A"}</div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Precio: {formatCurrency(mejorPrecio.precio)} | Desc: {mejorPrecio.descuento}%
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className={obtenerColorCosto(mejorCosto, mejorPrecio.precioNeto)}>
                            {formatCurrency(mejorCosto)}
                            {mejorCosto && mejorPrecio.precioNeto && (
                              <span className="text-xs block mt-1">
                                {mejorCosto > mejorPrecio.precioNeto ? '↑ Costo mayor' : mejorCosto < mejorPrecio.precioNeto * 0.8 ? '↓ Costo menor' : ''}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {mejorPrecio.existencia || 0}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">
                            {cantidadOpciones} {cantidadOpciones === 1 ? "opción" : "opciones"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Usar requestAnimationFrame para mejor rendimiento
                                requestAnimationFrame(() => {
                                  setProductoDetalles({
                                    descripcion: mejorPrecio.descripcion,
                                    codigo: mejorPrecio.codigo || "N/A",
                                    laboratorio: mejorPrecio.laboratorio || "N/A",
                                    todosLosPrecios: todosLosPrecios
                                  });
                                  // Abrir modal en el siguiente frame
                                  requestAnimationFrame(() => {
                                    setShowDetallesModal(true);
                                  });
                                });
                              }}
                              className="text-purple-600 hover:text-purple-800"
                              title="Ver existencias por farmacia"
                            >
                              <Info className="w-4 h-4 mr-1" />
                              Más Detalles
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAgregarCarrito(mejorPrecio)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Agregar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Filas expandidas con todos los precios */}
                      {isExpanded && todosLosPrecios.map((lista: ListaComparativa) => (
                        <TableRow key={lista._id} className="bg-gray-50">
                          <TableCell></TableCell>
                          <TableCell className="text-sm text-gray-600">{lista.codigo || "N/A"}</TableCell>
                          <TableCell className="text-sm">{lista.descripcion}</TableCell>
                          <TableCell className="text-sm">{lista.laboratorio || "N/A"}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{formatCurrency(lista.precioNeto)}</div>
                              <div className="text-xs text-gray-500">
                                Precio: {formatCurrency(lista.precio)} | Desc: {lista.descuento}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const colorProveedor = obtenerColorProveedor(lista.proveedorId);
                              return (
                                <div className="text-sm">
                                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border ${colorProveedor.bg} ${colorProveedor.text} ${colorProveedor.border}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full`} style={{ 
                                      backgroundColor: colorProveedor.bg.includes('blue') ? '#3b82f6' :
                                                      colorProveedor.bg.includes('green') ? '#10b981' :
                                                      colorProveedor.bg.includes('yellow') ? '#eab308' :
                                                      colorProveedor.bg.includes('purple') ? '#a855f7' :
                                                      colorProveedor.bg.includes('pink') ? '#ec4899' :
                                                      colorProveedor.bg.includes('indigo') ? '#6366f1' :
                                                      colorProveedor.bg.includes('red') ? '#ef4444' :
                                                      colorProveedor.bg.includes('teal') ? '#14b8a6' :
                                                      colorProveedor.bg.includes('orange') ? '#f97316' :
                                                      colorProveedor.bg.includes('cyan') ? '#06b6d4' :
                                                      colorProveedor.bg.includes('amber') ? '#f59e0b' :
                                                      colorProveedor.bg.includes('lime') ? '#84cc16' :
                                                      colorProveedor.bg.includes('emerald') ? '#10b981' :
                                                      colorProveedor.bg.includes('violet') ? '#8b5cf6' :
                                                      colorProveedor.bg.includes('rose') ? '#f43f5e' : '#6b7280'
                                    }}></div>
                                    <div className="font-medium text-xs">{lista.proveedor?.nombreJuridico || "N/A"}</div>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Desc. Comercial: {lista.proveedor?.descuentosComerciales || 0}%
                                  </div>
                                  {lista.fechaVencimiento && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Vence: {new Date(lista.fechaVencimiento).toLocaleDateString('es-VE')}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(lista.miCosto)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              {lista.existencias && Array.isArray(lista.existencias) && lista.existencias.length > 0 ? (
                                lista.existencias.map((exist: ExistenciaPorFarmacia, existIdx: number) => (
                                  <div key={existIdx} className="text-xs">
                                    <span className="font-medium">{exist.farmaciaNombre}:</span>{" "}
                                    <span>{exist.existencia}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs">Sin existencias</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAgregarCarrito(lista)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Agregar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(lista._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modal para subir Excel */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subir Lista de Precios desde Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Proveedor *
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedProveedor}
                onChange={(e) => setSelectedProveedor(e.target.value)}
                required
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((prov) => (
                  <option key={prov._id} value={prov._id}>
                    {prov.nombreJuridico}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo Excel *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-800 underline"
                >
                  {excelFile ? excelFile.name : "Haz clic para seleccionar archivo"}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Formatos aceptados: .xlsx, .xls
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Columnas requeridas: CODIGO, DESCRIPCION, LABORATORIO, PRECIO, DESCUENTO (%), FECHA DE VENCIMIENTO, EXISTENCIA
                </p>
              </div>
            </div>
            {(uploading || isProcessing) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    {isProcessing ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-blue-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {uploadProgress < 30 ? "Procesando archivo localmente..." : "Subiendo al servidor y guardando..."}
                      </>
                    ) : (
                      <>Subiendo archivo...</>
                    )}
                  </span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ease-in-out ${
                    isProcessing && uploadProgress >= 30 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                </div>
                {isProcessing && (
                  <p className="text-xs text-gray-500 mt-1">
                    El archivo se ha subido correctamente. Por favor espere mientras se procesa...
                  </p>
                )}
              </div>
            )}
            {uploadError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                Lista de precios cargada correctamente
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUploadModal(false);
              setExcelFile(null);
              setSelectedProveedor("");
              setUploadError(null);
              setUploadSuccess(false);
              setUploadProgress(0);
              setIsProcessing(false);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={(uploading || isProcessing) || !excelFile || !selectedProveedor}
              className="bg-green-600 hover:bg-green-700"
            >
              {(uploading || isProcessing) ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {isProcessing ? "Procesando..." : `Subiendo... ${uploadProgress}%`}
                </span>
              ) : (
                "Subir Lista"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para seleccionar proveedor a borrar */}
      <Dialog open={showDeleteProveedorModal} onOpenChange={setShowDeleteProveedorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrar Listas de Precios por Proveedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Proveedor
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={proveedorParaBorrar}
                onChange={(e) => setProveedorParaBorrar(e.target.value)}
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((prov) => (
                  <option key={prov._id} value={prov._id}>
                    {prov.nombreJuridico}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-600">
              Esta acción eliminará todas las listas de precios del proveedor seleccionado. Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteProveedorModal(false);
              setProveedorParaBorrar("");
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (proveedorParaBorrar) {
                  const proveedor = proveedores.find(p => p._id === proveedorParaBorrar);
                  setDeleteConfirm({
                    open: true,
                    proveedorId: proveedorParaBorrar,
                    proveedorNombre: proveedor?.nombreJuridico || "Proveedor"
                  });
                  setShowDeleteProveedorModal(false);
                  setProveedorParaBorrar("");
                }
              }}
              disabled={!proveedorParaBorrar}
              className="bg-red-600 hover:bg-red-700"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-gray-700">
            {deleteConfirm.proveedorId ? (
              <>
                ¿Está seguro de que desea eliminar todas las listas de precios del proveedor{" "}
                <strong>{deleteConfirm.proveedorNombre}</strong>? Esta acción no se puede deshacer.
              </>
            ) : (
              <>
                ¿Está seguro de que desea eliminar este item de la lista de precios? Esta acción no se puede deshacer.
              </>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false })}>
              Cancelar
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para agregar al carrito */}
      <Dialog open={showAgregarCarritoModal} onOpenChange={setShowAgregarCarritoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar a Orden de Compra</DialogTitle>
          </DialogHeader>
          {productoParaAgregar && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">{productoParaAgregar.descripcion}</p>
                <p className="text-sm text-gray-600">Código: {productoParaAgregar.codigo || "N/A"}</p>
                <p className="text-sm text-gray-600">Laboratorio: {productoParaAgregar.laboratorio || "N/A"}</p>
                <p className="text-sm text-gray-600">Proveedor: {productoParaAgregar.proveedor?.nombreJuridico || "N/A"}</p>
                <p className="text-sm font-semibold text-green-600">
                  Precio Neto: {formatCurrency(productoParaAgregar.precioNeto)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Farmacia *
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={farmaciaSeleccionada}
                  onChange={(e) => setFarmaciaSeleccionada(e.target.value)}
                  required
                >
                  <option value="">Selecciona una farmacia</option>
                  {farmacias.map((farmacia) => (
                    <option key={farmacia.id} value={farmacia.id}>
                      {farmacia.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={cantidadAgregar}
                  onChange={(e) => setCantidadAgregar(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgregarCarritoModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarAgregarCarrito}
              disabled={!farmaciaSeleccionada}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Agregar al Carrito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Orden de Compra */}
      <Dialog open={showCarritoModal} onOpenChange={setShowCarritoModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Orden de Compra</span>
              {ordenCompra.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limpiarCarrito}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar Todo
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {ordenCompra.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No hay productos en la orden de compra</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen general */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total de Items</p>
                    <p className="text-2xl font-bold">{totalItems}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total General</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalGeneral)}</p>
                  </div>
                </div>
              </div>

              {/* Exportar todas las farmacias */}
              <div className="flex gap-2">
                <Button
                  onClick={exportarTodasFarmaciasExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar Todas a Excel
                </Button>
              </div>

              {/* Orden por farmacia */}
              {ordenCompraPorFarmacia.map((grupo) => (
                <div key={grupo.farmacia} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{grupo.farmaciaNombre}</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportarExcelPorFarmacia(grupo.farmacia)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportarPDFPorFarmacia(grupo.farmacia)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Laboratorio</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Precio Neto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grupo.items.map((item) => (
                          <TableRow key={`${item.listaId}-${item.farmacia}`}>
                            <TableCell className="font-medium">{item.codigo || "N/A"}</TableCell>
                            <TableCell>{item.descripcion}</TableCell>
                            <TableCell>{item.laboratorio || "N/A"}</TableCell>
                            <TableCell>{item.proveedorNombre}</TableCell>
                            <TableCell>{formatCurrency(item.precioNeto)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => actualizarCantidad(item.listaId, item.farmacia, Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(item.precioNeto * item.cantidad)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => eliminarProducto(item.listaId, item.farmacia)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-100 font-bold">
                          <TableCell colSpan={6} className="text-right">
                            Total {grupo.farmaciaNombre}:
                          </TableCell>
                          <TableCell className="text-lg text-green-600">
                            {formatCurrency(grupo.total)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCarritoModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles - Existencias por Farmacia */}
      <Dialog open={showDetallesModal} onOpenChange={setShowDetallesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Existencias por Sucursal</DialogTitle>
          </DialogHeader>
          {productoDetalles && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-lg">{productoDetalles.descripcion}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                  <p><span className="font-medium">Código:</span> {productoDetalles.codigo}</p>
                  <p><span className="font-medium">Laboratorio:</span> {productoDetalles.laboratorio}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Existencias por Sucursal y Proveedor:</h3>
                {listasProcesadasModal.map((lista, idx) => (
                  <div key={lista._id || idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-blue-600">{lista.proveedor?.nombreJuridico || "Proveedor N/A"}</p>
                        <p className="text-sm text-gray-600">
                          Precio: {formatCurrency(lista.precioNeto)} | Existencia en Proveedor: <span className="font-semibold">{lista.existencia || 0}</span>
                        </p>
                        {lista.miCosto && (
                          <p className="text-sm text-gray-600 mt-1">
                            Mi Costo: <span className="font-semibold text-blue-600">{formatCurrency(lista.miCosto)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {lista.existencias && Array.isArray(lista.existencias) && lista.existencias.length > 0 ? (
                      <div className="mt-3">
                        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm font-semibold text-blue-700 mb-1">
                            Mi Costo Promedio: {formatCurrency(lista.miCosto || null)}
                          </p>
                          {lista.miCosto && lista.precioNeto && (
                            <p className="text-xs text-blue-600">
                              {lista.miCosto > lista.precioNeto 
                                ? `⚠️ Tu costo es ${((lista.miCosto - lista.precioNeto) / lista.precioNeto * 100).toFixed(1)}% mayor que el precio del proveedor`
                                : `✅ Tu costo es ${((lista.precioNeto - lista.miCosto) / lista.precioNeto * 100).toFixed(1)}% menor que el precio del proveedor`
                              }
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Existencias en mis Farmacias:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {lista.existencias.map((exist: ExistenciaPorFarmacia, existIdx: number) => (
                            <div key={existIdx} className="bg-gray-50 p-3 rounded border border-gray-200">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <span className="text-sm font-semibold text-gray-800">{exist.farmaciaNombre}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  {exist.costo !== undefined && exist.costo !== null && (
                                    <div className="text-right">
                                      <span className="text-xs text-gray-500 block">Costo:</span>
                                      <span className="text-sm font-semibold text-blue-600">{formatCurrency(exist.costo)}</span>
                                    </div>
                                  )}
                                  <div className="text-right">
                                    <span className="text-xs text-gray-500 block">Existencia:</span>
                                    <span className="text-sm font-semibold text-green-600">{exist.existencia}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t space-y-1">
                          <p className="text-sm text-gray-600 flex justify-between">
                            <span className="font-medium">Total en mis Farmacias:</span>
                            <span className="font-semibold text-green-600">
                              {lista.totalExistencia} unidades
                            </span>
                          </p>
                          {lista.tieneCostos && lista.costoPromedioPonderado !== null && (
                            <p className="text-sm text-gray-600 flex justify-between">
                              <span className="font-medium">Costo Promedio Ponderado:</span>
                              <span className="font-semibold text-blue-600">
                                {formatCurrency(lista.costoPromedioPonderado)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-gray-500 italic">
                        No hay existencias registradas en tus farmacias para este producto.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDetallesModal(false);
              setProductoDetalles(null);
            }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListasComparativasPage;

