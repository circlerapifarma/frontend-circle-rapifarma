import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface FarmaciaChip {
  id: string;
  nombre: string;
}

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
}

interface InventarioItemExcel {
  codigo: string;
  descripcion: string;
  laboratorio: string;
  costo: number;
  utilidad: number;
  precio: number;
  existencia: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VisualizarInventariosPage: React.FC = () => {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");
  const [articuloFiltro, setArticuloFiltro] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteFarmacia, setPendingDeleteFarmacia] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFarmacia, setExcelFarmacia] = useState<string>("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<InventarioItemExcel[]>([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  const fetchInventarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const res = await fetch(`${API_BASE_URL}/inventarios`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al obtener inventarios");
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener inventarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventarios();
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/farmacias`)
      .then(res => res.json())
      .then(data => {
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
        if (lista.length === 1) setSelectedFarmacia(lista[0].id);
      });
  }, []);

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setExcelError(null);
    setExcelData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          setExcelError("El archivo Excel debe tener al menos una fila de datos (después del encabezado)");
          return;
        }

        // Obtener encabezados (primera fila)
        const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
        
        // Buscar índices de columnas
        const codigoIdx = headers.findIndex(h => h.includes("codigo") || h.includes("código"));
        const descripcionIdx = headers.findIndex(h => h.includes("descripcion") || h.includes("descripción"));
        const laboratorioIdx = headers.findIndex(h => h.includes("laboratorio"));
        const costoIdx = headers.findIndex(h => h.includes("costo"));
        const utilidadIdx = headers.findIndex(h => h.includes("utilidad"));
        const precioIdx = headers.findIndex(h => h.includes("precio"));
        const existenciaIdx = headers.findIndex(h => h.includes("existencia"));

        if (codigoIdx === -1 || descripcionIdx === -1 || laboratorioIdx === -1 || 
            costoIdx === -1 || utilidadIdx === -1 || precioIdx === -1 || existenciaIdx === -1) {
          setExcelError("El archivo Excel debe tener las columnas: codigo, descripcion, laboratorio, costo, utilidad, precio, existencia");
          return;
        }

        // Procesar datos (desde la segunda fila)
        const items: InventarioItemExcel[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const codigo = String(row[codigoIdx] || "").trim();
          const descripcion = String(row[descripcionIdx] || "").trim();
          const laboratorio = String(row[laboratorioIdx] || "").trim();
          const costo = parseFloat(String(row[costoIdx] || 0));
          const utilidad = parseFloat(String(row[utilidadIdx] || 0));
          const precio = parseFloat(String(row[precioIdx] || 0));
          const existencia = parseFloat(String(row[existenciaIdx] || 0));

          if (!codigo || !descripcion) continue; // Saltar filas vacías

          items.push({
            codigo,
            descripcion,
            laboratorio,
            costo: isNaN(costo) ? 0 : costo,
            utilidad: isNaN(utilidad) ? 0 : utilidad,
            precio: isNaN(precio) ? 0 : precio,
            existencia: isNaN(existencia) ? 0 : existencia,
          });
        }

        if (items.length === 0) {
          setExcelError("No se encontraron datos válidos en el archivo Excel");
          return;
        }

        setExcelData(items);
      } catch (error: any) {
        setExcelError(`Error al leer el archivo Excel: ${error.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelSubmit = async () => {
    if (!excelFarmacia) {
      setExcelError("Por favor, selecciona una farmacia");
      return;
    }

    if (excelData.length === 0) {
      setExcelError("No hay datos para enviar");
      return;
    }

    setExcelLoading(true);
    setExcelError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
      const correoUsuario = usuario?.correo || "";

      const res = await fetch(`${API_BASE_URL}/inventarios/excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          farmacia: excelFarmacia,
          items: excelData,
          usuarioCorreo: correoUsuario
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || errorData.message || "Error al guardar inventario");
      }

      // Limpiar formulario
      setExcelFarmacia("");
      setExcelFile(null);
      setExcelData([]);
      setShowExcelModal(false);
      
      // Recargar inventarios
      await fetchInventarios();
      
      alert(`Inventario guardado correctamente. Se procesaron ${excelData.length} items.`);
    } catch (err: any) {
      setExcelError(err.message || "Error al guardar inventario");
    } finally {
      setExcelLoading(false);
    }
  };

  const handleCloseExcelModal = () => {
    setShowExcelModal(false);
    setExcelFarmacia("");
    setExcelFile(null);
    setExcelData([]);
    setExcelError(null);
  };

  const handleDeleteInventarioCompleto = async (farmaciaId: string) => {
    if (!farmaciaId) {
      setError("ID de farmacia no válido");
      return;
    }

    setDeleting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }
      
      console.log("Iniciando eliminación para farmacia:", farmaciaId);
      console.log("Items totales:", items.length);
      
      // Obtener todos los items de esa farmacia que tengan _id válido
      const itemsFarmacia = items.filter(item => {
        const match = item.farmacia === farmaciaId && item._id && item._id !== "undefined";
        if (!match && item.farmacia === farmaciaId) {
          console.warn("Item sin ID válido:", item);
        }
        return match;
      });
      
      console.log("Items a eliminar:", itemsFarmacia.length);
      
      if (itemsFarmacia.length === 0) {
        setError("No hay items válidos para eliminar en esta farmacia");
        setDeleting(false);
        return;
      }

      // Eliminar cada item con validación
      const deletePromises = itemsFarmacia.map(async (item) => {
        if (!item._id || item._id === "undefined") {
          console.warn(`Item sin ID válido:`, item);
          return { ok: false, item };
        }
        
        try {
          const url = `${API_BASE_URL}/inventarios/${item._id}`;
          console.log("Eliminando item:", url);
          
          const res = await fetch(url, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error(`Error al eliminar item ${item._id}:`, res.status, errorData);
          }
          
          return { ok: res.ok, item, status: res.status };
        } catch (error) {
          console.error(`Error al eliminar item ${item._id}:`, error);
          return { ok: false, item, error };
        }
      });

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok);
      
      console.log("Resultados de eliminación:", {
        total: results.length,
        exitosos: results.length - failed.length,
        fallidos: failed.length
      });
      
      if (failed.length > 0) {
        console.error("Items que fallaron al eliminar:", failed);
        throw new Error(`Error al eliminar ${failed.length} de ${itemsFarmacia.length} items`);
      }

      // Recargar inventarios
      await fetchInventarios();
      setShowDeleteModal(false);
      setPendingDeleteFarmacia(null);
      
      alert(`Inventario eliminado correctamente. Se eliminaron ${itemsFarmacia.length} items.`);
    } catch (err: any) {
      console.error("Error completo al eliminar inventario:", err);
      setError(err.message || "Error al eliminar inventario");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = (farmaciaId: string) => {
    setPendingDeleteFarmacia(farmaciaId);
    setShowDeleteModal(true);
  };

  // Filtrar items
  const itemsFiltrados = items
    .filter(item => !selectedFarmacia || item.farmacia === selectedFarmacia)
    .filter(item => {
      if (!articuloFiltro) return true;
      const filtro = articuloFiltro.toLowerCase();
      return (
        item.codigo?.toLowerCase().includes(filtro) ||
        item.descripcion?.toLowerCase().includes(filtro) ||
        item.laboratorio?.toLowerCase().includes(filtro)
      );
    });

  // Calcular totales
  const totalGeneral = itemsFiltrados.reduce((sum, item) => {
    return sum + (item.existencia * item.costo);
  }, 0);
  
  const totalItems = itemsFiltrados.length;
  
  // Totales por farmacia (con Total Cantidad y SKU)
  const totalesPorFarmacia = itemsFiltrados.reduce((acc, item) => {
    const farmaciaNombre = farmacias.find(f => f.id === item.farmacia)?.nombre || item.farmacia;
    if (!acc[farmaciaNombre]) {
      acc[farmaciaNombre] = { 
        total: 0, 
        items: 0, 
        farmaciaId: item.farmacia,
        totalCantidad: 0,
        codigos: new Set<string>()
      };
    }
    acc[farmaciaNombre].total += (item.existencia * item.costo);
    acc[farmaciaNombre].items += 1;
    acc[farmaciaNombre].totalCantidad += (item.existencia || 0);
    if (item.codigo) {
      acc[farmaciaNombre].codigos.add(item.codigo.toLowerCase().trim());
    }
    return acc;
  }, {} as Record<string, { 
    total: number; 
    items: number; 
    farmaciaId: string;
    totalCantidad: number;
    codigos: Set<string>;
  }>);

  // Convertir Sets a números para SKU
  const totalesPorFarmaciaFinal = Object.entries(totalesPorFarmacia).reduce((acc, [farmacia, datos]) => {
    acc[farmacia] = {
      ...datos,
      sku: datos.codigos.size
    };
    return acc;
  }, {} as Record<string, { 
    total: number; 
    items: number; 
    farmaciaId: string;
    totalCantidad: number;
    sku: number;
  }>);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Inventarios Registrados</h1>
          <button
            onClick={() => setShowExcelModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar desde Excel
          </button>
        </div>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Total General</p>
                <p className="text-3xl font-bold mt-2">
                  ${totalGeneral.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Total Items</p>
                <p className="text-3xl font-bold mt-2">{totalItems}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Farmacias</p>
                <p className="text-3xl font-bold mt-2">{Object.keys(totalesPorFarmaciaFinal).length}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Totales por Farmacia */}
        {Object.keys(totalesPorFarmaciaFinal).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-700 mb-4">Totales por Farmacia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(totalesPorFarmaciaFinal).map(([farmacia, datos]) => (
                <div key={farmacia} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-sm font-medium text-slate-600">{farmacia}</p>
                    <button
                      onClick={() => handleDeleteClick(datos.farmaciaId)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-md transition-colors duration-150 text-xs"
                      title="Eliminar inventario completo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Total General</p>
                      <p className="text-2xl font-bold text-slate-800">
                        ${datos.total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Cantidad</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {datos.totalCantidad.toLocaleString('es-VE')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">SKU</p>
                        <p className="text-lg font-semibold text-emerald-600">
                          {datos.sku.toLocaleString('es-VE')}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">{datos.items} {datos.items === 1 ? 'item' : 'items'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {farmacias.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Farmacia</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedFarmacia("")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-in-out
                                ${!selectedFarmacia 
                                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-300'}`}
                  >
                    Todas
                  </button>
                  {farmacias.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFarmacia(f.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-in-out
                                  ${selectedFarmacia === f.id 
                                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-300'}`}
                    >
                      {f.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label htmlFor="articuloFiltro" className="block text-sm font-medium text-slate-600 mb-2">Buscar por Artículo</label>
              <input 
                type="text" 
                id="articuloFiltro"
                value={articuloFiltro} 
                onChange={e => setArticuloFiltro(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm" 
                placeholder="Buscar por código, descripción o laboratorio..." />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando inventarios...
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay inventarios registrados</h3>
            <p className="mt-1 text-sm text-slate-500">No se encontraron items que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    {['Código', 'Descripción', 'Laboratorio', 'Costo', 'Utilidad', 'Precio', 'Existencia', 'Farmacia'].map(header => (
                      <th key={header} scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {itemsFiltrados.map(item => {
                    const farmaciaNombre = farmacias.find(f => f.id === item.farmacia)?.nombre || item.farmacia;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{item.codigo}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{item.descripcion}</td>
                        <td className="px-5 py-4 text-sm text-slate-700">{item.laboratorio}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                          ${item.costo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                          {item.utilidad.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                          ${item.precio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right">
                          {item.existencia.toLocaleString('es-VE')}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">{farmaciaNombre}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteModal && pendingDeleteFarmacia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-3 text-red-600">Confirmar eliminación</h3>
              <p className="mb-5 text-slate-600 text-sm">
                ¿Está seguro que desea eliminar el inventario completo de esta farmacia? Esta acción eliminará todos los items y no se puede deshacer.
              </p>
              {error && (
                <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPendingDeleteFarmacia(null);
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (pendingDeleteFarmacia) {
                      handleDeleteInventarioCompleto(pendingDeleteFarmacia);
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-medium disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para cargar Excel */}
        {showExcelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-slate-800">Agregar Inventario desde Excel</h3>
                <button
                  onClick={handleCloseExcelModal}
                  className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {excelError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md">
                  <p className="font-bold">Error</p>
                  <p>{excelError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Seleccionar Farmacia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={excelFarmacia}
                    onChange={(e) => setExcelFarmacia(e.target.value)}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 py-2 px-3"
                    required
                  >
                    <option value="">Selecciona una farmacia</option>
                    {farmacias.map(f => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Archivo Excel <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Formato requerido: codigo, descripcion, laboratorio, costo, utilidad, precio, existencia
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelFileChange}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 py-2 px-3"
                  />
                  {excelFile && (
                    <p className="text-sm text-slate-600 mt-2">Archivo seleccionado: {excelFile.name}</p>
                  )}
                </div>

                {excelData.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-700 mb-2">
                      Vista previa ({excelData.length} items)
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                            <th className="px-3 py-2 text-left">Laboratorio</th>
                            <th className="px-3 py-2 text-right">Costo</th>
                            <th className="px-3 py-2 text-right">Utilidad</th>
                            <th className="px-3 py-2 text-right">Precio</th>
                            <th className="px-3 py-2 text-right">Existencia</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {excelData.slice(0, 10).map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2">{item.codigo}</td>
                              <td className="px-3 py-2">{item.descripcion}</td>
                              <td className="px-3 py-2">{item.laboratorio}</td>
                              <td className="px-3 py-2 text-right">{item.costo.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{item.utilidad.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{item.precio.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{item.existencia}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {excelData.length > 10 && (
                        <p className="text-xs text-slate-500 p-2 text-center">
                          Mostrando 10 de {excelData.length} items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleCloseExcelModal}
                    className="px-4 py-2 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium"
                    disabled={excelLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExcelSubmit}
                    className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
                    disabled={excelLoading || !excelFarmacia || excelData.length === 0}
                  >
                    {excelLoading ? "Guardando..." : "Guardar Inventario"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizarInventariosPage;
