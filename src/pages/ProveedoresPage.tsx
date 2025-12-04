import React, { useState } from "react";
import { useProveedores, Proveedor } from "@/hooks/useProveedores";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, Plus, Search } from "lucide-react";

const ProveedoresPage: React.FC = () => {
  const {
    proveedores,
    loading,
    error,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
  } = useProveedores();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [proveedorToDelete, setProveedorToDelete] = useState<Proveedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<Proveedor>({
    nombreJuridico: "",
    rif: "",
    direccion: "",
    numeroTelefono: "",
    diasCredito: 0,
    descuentosComerciales: 0,
    descuentosProntoPago: 0,
  });

  const handleOpenModal = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingProveedor(proveedor);
      setFormData(proveedor);
    } else {
      setEditingProveedor(null);
      setFormData({
        nombreJuridico: "",
        rif: "",
        direccion: "",
        numeroTelefono: "",
        diasCredito: 0,
        descuentosComerciales: 0,
        descuentosProntoPago: 0,
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProveedor(null);
    setFormData({
      nombreJuridico: "",
      rif: "",
      direccion: "",
      numeroTelefono: "",
      diasCredito: 0,
      descuentosComerciales: 0,
      descuentosProntoPago: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProveedor && editingProveedor._id) {
        await actualizarProveedor(editingProveedor._id, formData);
      } else {
        await crearProveedor(formData);
      }
      handleCloseModal();
    } catch (err) {
      console.error("Error al guardar proveedor:", err);
    }
  };

  const handleDelete = (proveedor: Proveedor) => {
    setProveedorToDelete(proveedor);
    setModalDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (proveedorToDelete && proveedorToDelete._id) {
      try {
        await eliminarProveedor(proveedorToDelete._id);
        setModalDeleteOpen(false);
        setProveedorToDelete(null);
      } catch (err) {
        console.error("Error al eliminar proveedor:", err);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "diasCredito" ||
        name === "descuentosComerciales" ||
        name === "descuentosProntoPago"
          ? value === "" ? 0 : Number(value)
          : value,
    }));
  };

  // Filtrar proveedores por término de búsqueda
  const proveedoresFiltrados = proveedores.filter(
    (proveedor) =>
      proveedor.nombreJuridico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.rif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.numeroTelefono.includes(searchTerm)
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Proveedores</h1>
        <Button onClick={() => handleOpenModal()} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Proveedor
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por nombre, RIF o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de proveedores */}
      {loading ? (
        <div className="text-center py-8">Cargando proveedores...</div>
      ) : proveedoresFiltrados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? "No se encontraron proveedores con ese criterio." : "No hay proveedores registrados."}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre Jurídico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RIF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Crédito
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desc. Comercial (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desc. Pronto Pago (%)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proveedoresFiltrados.map((proveedor) => (
                  <tr key={proveedor._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {proveedor.nombreJuridico}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proveedor.rif}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {proveedor.direccion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proveedor.numeroTelefono}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proveedor.diasCredito}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proveedor.descuentosComerciales}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proveedor.descuentosProntoPago}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(proveedor)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(proveedor)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para crear/editar proveedor */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProveedor ? "Editar Proveedor" : "Agregar Proveedor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Jurídico *
              </label>
              <Input
                type="text"
                name="nombreJuridico"
                value={formData.nombreJuridico}
                onChange={handleChange}
                required
                placeholder="Ej: Farmacia ABC, C.A."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RIF *
              </label>
              <Input
                type="text"
                name="rif"
                value={formData.rif}
                onChange={handleChange}
                required
                placeholder="Ej: J-12345678-9"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección *
              </label>
              <Input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                required
                placeholder="Ej: Av. Principal, Caracas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Teléfono *
              </label>
              <Input
                type="text"
                name="numeroTelefono"
                value={formData.numeroTelefono}
                onChange={handleChange}
                required
                placeholder="Ej: 0412-1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días de Crédito *
              </label>
              <Input
                type="number"
                name="diasCredito"
                value={formData.diasCredito}
                onChange={handleChange}
                required
                min="0"
                placeholder="Ej: 30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descuentos Comerciales (%)
              </label>
              <Input
                type="number"
                name="descuentosComerciales"
                value={formData.descuentosComerciales}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                placeholder="Ej: 5.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descuentos por Pronto Pago (%)
              </label>
              <Input
                type="number"
                name="descuentosProntoPago"
                value={formData.descuentosProntoPago}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                placeholder="Ej: 2.0"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingProveedor ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <Dialog open={modalDeleteOpen} onOpenChange={setModalDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-gray-700">
            ¿Está seguro de que desea eliminar el proveedor{" "}
            <strong>{proveedorToDelete?.nombreJuridico}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProveedoresPage;

