import React, { useState, useEffect } from "react";
import { useListasComparativas, type ListaComparativa, type ExistenciaPorFarmacia } from "@/hooks/useListasComparativas";
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
import { Search, Upload, Trash2, FileSpreadsheet, ChevronDown, ChevronRight, ShoppingCart, X, FileDown, FileText } from "lucide-react";
import { useOrdenCompra } from "@/hooks/useOrdenCompra";

const ListasComparativasPage: React.FC = () => {
  const {
    listas,
    proveedores,
    loading,
    error,
    fetchListas,
    buscarListas,
    subirListaExcel,
    eliminarLista,
    eliminarListasPorProveedor,
  } = useListasComparativas();

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroProveedor, setFiltroProveedor] = useState("");
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id?: string;
    proveedorId?: string;
    proveedorNombre?: string;
  }>({ open: false });

  useEffect(() => {
    fetchListas();
  }, []);

  useEffect(() => {
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
    }, 300); // Debounce de 300ms

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

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await subirListaExcel(excelFile, selectedProveedor, (progress) => {
        setUploadProgress(progress);
      });
      setUploadSuccess(true);
      setUploadProgress(100);
      setExcelFile(null);
      setSelectedProveedor("");
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
        setUploadProgress(0);
        fetchListas();
      }, 2000);
    } catch (err: any) {
      setUploadError(err.message || "Error al subir el archivo");
      setUploadProgress(0);
    } finally {
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

  // Función para agrupar productos
  const agruparProductos = (listas: ListaComparativa[]) => {
    const grupos = new Map<string, ListaComparativa[]>();
    
    listas.forEach((lista: ListaComparativa) => {
      // Prioridad 1: Agrupar por código (si existe y no está vacío)
      let clave = "";
      if (lista.codigo && lista.codigo.trim() !== "") {
        clave = `codigo:${lista.codigo.toLowerCase().trim()}`;
      } else {
        // Prioridad 2: Agrupar por nombre + laboratorio
        const nombreNormalizado = lista.descripcion.toLowerCase().trim();
        const labNormalizado = (lista.laboratorio || "").toLowerCase().trim();
        clave = `nombre:${nombreNormalizado}|lab:${labNormalizado}`;
      }
      
      if (!grupos.has(clave)) {
        grupos.set(clave, []);
      }
      grupos.get(clave)!.push(lista);
    });
    
    // Convertir a array y ordenar cada grupo por precio neto (mejor precio primero)
    return Array.from(grupos.entries()).map(([clave, items]) => {
      const sorted = [...items].sort((a, b) => a.precioNeto - b.precioNeto);
      const mejorPrecio = sorted[0];
      
      // Calcular existencia total: sumar todas las existencias de todas las farmacias de todos los productos del grupo
      // Primero, crear un mapa de farmacias para evitar duplicados
      const existenciasPorFarmacia = new Map<string, number>();
      
      sorted.forEach((item) => {
        item.existencias.forEach((exist: ExistenciaPorFarmacia) => {
          const farmaciaKey = exist.farmacia;
          const existenciaActual = existenciasPorFarmacia.get(farmaciaKey) || 0;
          existenciasPorFarmacia.set(farmaciaKey, existenciaActual + exist.existencia);
        });
      });
      
      // Sumar todas las existencias
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

  const productosAgrupados = agruparProductos(listas);
  
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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Listas Comparativas</h1>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Subir Lista de Precios
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filtros de búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <select
            className="border rounded px-3 py-2"
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
      </div>

      {/* Tabla de listas comparativas */}
      {loading ? (
        <div className="text-center py-8">Cargando listas comparativas...</div>
      ) : productosAgrupados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay listas de precios disponibles. Sube una lista de precios para comenzar.
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
                  <TableHead>Existencia Total</TableHead>
                  <TableHead>Opciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosAgrupados.map((grupo) => {
                  const isExpanded = expandedProducts.has(grupo.clave);
                  const { mejorPrecio, todosLosPrecios, cantidadOpciones, existenciaTotal, mejorCosto } = grupo;
                  
                  return (
                    <React.Fragment key={grupo.clave}>
                      {/* Fila principal con el mejor precio */}
                      <TableRow className="bg-green-50 hover:bg-green-100">
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
                          {formatCurrency(mejorPrecio.precioNeto)}
                          {cantidadOpciones > 1 && (
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                              ({cantidadOpciones} opciones)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{mejorPrecio.proveedor.nombreJuridico}</div>
                          <div className="text-xs text-gray-500">
                            Precio: {formatCurrency(mejorPrecio.precio)} | Desc: {mejorPrecio.descuento}%
                          </div>
                        </TableCell>
                        <TableCell className={mejorCosto ? "font-semibold" : ""}>
                          {formatCurrency(mejorCosto)}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {existenciaTotal > 0 ? existenciaTotal : "0"}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">
                            {cantidadOpciones} {cantidadOpciones === 1 ? "opción" : "opciones"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAgregarCarrito(mejorPrecio)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Agregar
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {/* Filas expandidas con todos los precios */}
                      {isExpanded && todosLosPrecios.map((lista) => (
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
                            <div className="text-sm">
                              <div className="font-medium">{lista.proveedor.nombreJuridico}</div>
                              <div className="text-xs text-gray-500">
                                Desc. Comercial: {lista.proveedor.descuentosComerciales}%
                              </div>
                              {lista.fechaVencimiento && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Vence: {new Date(lista.fechaVencimiento).toLocaleDateString('es-VE')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(lista.miCosto)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              {lista.existencias.length > 0 ? (
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
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subiendo archivo...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
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
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !excelFile || !selectedProveedor}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading ? (
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
                  Subiendo... {uploadProgress}%
                </span>
              ) : (
                "Subir Lista"
              )}
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
                <p className="text-sm text-gray-600">Proveedor: {productoParaAgregar.proveedor.nombreJuridico}</p>
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
    </div>
  );
};

export default ListasComparativasPage;

