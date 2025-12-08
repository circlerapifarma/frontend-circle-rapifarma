import React, { useState } from "react";
import { useOrdenCompra } from "@/hooks/useOrdenCompra";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ShoppingCart, FileDown, FileText, Printer, CheckCircle, Trash2, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const OrdenCompraPage: React.FC = () => {
  const {
    ordenCompraPorFarmacia,
    farmacias,
    eliminarProducto,
    actualizarCantidad,
    limpiarCarrito,
    exportarExcelPorFarmacia,
    exportarPDFPorFarmacia,
    totalItems,
    totalGeneral,
  } = useOrdenCompra();

  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");
  const [showTotalizarModal, setShowTotalizarModal] = useState(false);
  const [farmaciaParaTotalizar, setFarmaciaParaTotalizar] = useState<string>("");
  const [totalizando, setTotalizando] = useState(false);
  const [editandoCantidad, setEditandoCantidad] = useState<{ listaId: string; farmaciaId: string } | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(1);

  // Filtrar órdenes por farmacia seleccionada
  const ordenesFiltradas = farmaciaSeleccionada
    ? ordenCompraPorFarmacia.filter(o => o.farmacia === farmaciaSeleccionada)
    : ordenCompraPorFarmacia;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleTotalizar = (farmaciaId: string) => {
    setFarmaciaParaTotalizar(farmaciaId);
    setShowTotalizarModal(true);
  };

  const confirmarTotalizar = async () => {
    if (!farmaciaParaTotalizar) return;

    setTotalizando(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem("token");
      const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

      if (!token || !usuario) {
        throw new Error("No se encontró el token de autenticación");
      }

      const orden = ordenCompraPorFarmacia.find(o => o.farmacia === farmaciaParaTotalizar);
      if (!orden) {
        throw new Error("No se encontró la orden de compra");
      }

      // Preparar datos para enviar al backend
      const ordenData = {
        farmaciaId: orden.farmacia,
        farmaciaNombre: orden.farmaciaNombre,
        items: orden.items.map(item => ({
          listaId: item.listaId,
          codigo: item.codigo,
          descripcion: item.descripcion,
          laboratorio: item.laboratorio,
          precio: item.precio,
          descuento: item.descuento,
          precioNeto: item.precioNeto,
          cantidad: item.cantidad,
          subtotal: item.precioNeto * item.cantidad,
          proveedorId: item.proveedorId,
          proveedorNombre: item.proveedorNombre,
          fechaVencimiento: item.fechaVencimiento,
        })),
        total: orden.total,
        usuarioCorreo: usuario.correo,
        fechaCreacion: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/ordenes-compra`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(ordenData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al guardar la orden de compra");
      }

      // Eliminar items de esta farmacia del carrito
      orden.items.forEach(item => {
        eliminarProducto(item.listaId, item.farmacia);
      });

      alert(`✅ Orden de compra totalizada y guardada correctamente para ${orden.farmaciaNombre}`);
      setShowTotalizarModal(false);
      setFarmaciaParaTotalizar("");
    } catch (error: any) {
      console.error("Error al totalizar:", error);
      alert(`Error al totalizar la orden: ${error.message}`);
    } finally {
      setTotalizando(false);
    }
  };

  const iniciarEdicionCantidad = (listaId: string, farmaciaId: string, cantidadActual: number) => {
    setEditandoCantidad({ listaId, farmaciaId });
    setNuevaCantidad(cantidadActual);
  };

  const confirmarEdicionCantidad = () => {
    if (editandoCantidad && nuevaCantidad > 0) {
      actualizarCantidad(editandoCantidad.listaId, editandoCantidad.farmaciaId, nuevaCantidad);
      setEditandoCantidad(null);
      setNuevaCantidad(1);
    }
  };

  const cancelarEdicionCantidad = () => {
    setEditandoCantidad(null);
    setNuevaCantidad(1);
  };

  if (ordenCompraPorFarmacia.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No hay órdenes de compra</h2>
          <p className="text-gray-600 mb-4">
            Agrega productos desde el módulo de Listas Comparativas para crear una orden de compra.
          </p>
          <Button
            onClick={() => window.location.href = "/listas-comparativas"}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Ir a Listas Comparativas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Orden de Compra</h1>
          <div className="flex gap-2">
            <select
              className="border rounded px-3 py-2"
              value={farmaciaSeleccionada}
              onChange={(e) => setFarmaciaSeleccionada(e.target.value)}
            >
              <option value="">Todas las farmacias</option>
              {farmacias.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
            {ordenCompraPorFarmacia.length > 0 && (
              <Button
                variant="outline"
                onClick={limpiarCarrito}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar Todo
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Total de Items</p>
            <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm text-gray-600 mb-1">Total General</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalGeneral)}</p>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <p className="text-sm text-gray-600 mb-1">Farmacias</p>
            <p className="text-2xl font-bold text-purple-600">{ordenCompraPorFarmacia.length}</p>
          </Card>
        </div>
      </div>

      {/* Órdenes por farmacia */}
      {ordenesFiltradas.map((orden) => {
        // Agrupar items por proveedor
        const itemsPorProveedor = new Map<string, typeof orden.items>();
        orden.items.forEach(item => {
          const proveedorKey = item.proveedorId;
          if (!itemsPorProveedor.has(proveedorKey)) {
            itemsPorProveedor.set(proveedorKey, []);
          }
          itemsPorProveedor.get(proveedorKey)!.push(item);
        });

        return (
          <Card key={orden.farmacia} className="mb-6 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{orden.farmaciaNombre}</h2>
                <p className="text-sm text-gray-600">
                  {orden.items.length} items • Total: {formatCurrency(orden.total)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => exportarExcelPorFarmacia(orden.farmacia)}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportarPDFPorFarmacia(orden.farmacia)}
                  className="border-green-300 text-green-600 hover:bg-green-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  onClick={() => handleTotalizar(orden.farmacia)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Totalizar
                </Button>
              </div>
            </div>

            {/* Items agrupados por proveedor */}
            {Array.from(itemsPorProveedor.entries()).map(([proveedorId, items]) => {
              const proveedorNombre = items[0]?.proveedorNombre || "N/A";
              const subtotalProveedor = items.reduce((sum, item) => sum + (item.precioNeto * item.cantidad), 0);

              return (
                <div key={proveedorId} className="mb-6 border-b pb-4 last:border-b-0">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    Proveedor: {proveedorNombre}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Laboratorio</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Desc. (%)</TableHead>
                          <TableHead>Precio Neto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => {
                          const subtotal = item.precioNeto * item.cantidad;
                          const isEditing = editandoCantidad?.listaId === item.listaId && 
                                          editandoCantidad?.farmaciaId === item.farmacia;

                          return (
                            <TableRow key={`${item.listaId}-${item.farmacia}-${idx}`}>
                              <TableCell className="font-medium">{item.codigo}</TableCell>
                              <TableCell>{item.descripcion}</TableCell>
                              <TableCell>{item.laboratorio || "N/A"}</TableCell>
                              <TableCell>{formatCurrency(item.precio)}</TableCell>
                              <TableCell>{item.descuento}%</TableCell>
                              <TableCell className="font-semibold text-green-700">
                                {formatCurrency(item.precioNeto)}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      value={nuevaCantidad}
                                      onChange={(e) => setNuevaCantidad(parseInt(e.target.value) || 1)}
                                      className="w-20"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={confirmarEdicionCantidad}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelarEdicionCantidad}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{item.cantidad}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => iniciarEdicionCantidad(item.listaId, item.farmacia, item.cantidad)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-bold text-blue-700">
                                {formatCurrency(subtotal)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => eliminarProducto(item.listaId, item.farmacia)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-gray-50 font-bold">
                          <TableCell colSpan={7} className="text-right">
                            Subtotal {proveedorNombre}:
                          </TableCell>
                          <TableCell colSpan={2} className="text-blue-700">
                            {formatCurrency(subtotalProveedor)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-700">
                    Total {orden.farmaciaNombre}: <span className="text-2xl text-green-700">{formatCurrency(orden.total)}</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Modal de confirmación para totalizar */}
      <Dialog open={showTotalizarModal} onOpenChange={setShowTotalizarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Totalizar Orden de Compra</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas totalizar y guardar esta orden de compra? 
              Una vez totalizada, se guardará en el sistema y se eliminará del carrito.
            </DialogDescription>
          </DialogHeader>
          {farmaciaParaTotalizar && (
            <div className="py-4">
              <p className="font-semibold mb-2">
                Farmacia: {ordenCompraPorFarmacia.find(o => o.farmacia === farmaciaParaTotalizar)?.farmaciaNombre}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Items: {ordenCompraPorFarmacia.find(o => o.farmacia === farmaciaParaTotalizar)?.items.length}
              </p>
              <p className="text-lg font-bold text-green-700">
                Total: {formatCurrency(ordenCompraPorFarmacia.find(o => o.farmacia === farmaciaParaTotalizar)?.total || 0)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTotalizarModal(false)}
              disabled={totalizando}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarTotalizar}
              disabled={totalizando}
              className="bg-green-600 hover:bg-green-700"
            >
              {totalizando ? "Guardando..." : "Totalizar y Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdenCompraPage;

