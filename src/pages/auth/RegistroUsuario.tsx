import React, { useState, type FormEvent } from "react";
import {
  AiOutlineUser,
  AiOutlineMail,
  AiOutlineLock,
  AiOutlineShop,
  AiOutlineSafety,
} from "react-icons/ai";

// Asegúrate de definir la URL base de tu API, por ejemplo, usando una variable de entorno:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"; // Reemplaza con tu base URL real

// --- INTERFACES DE TYPESCRIPT ---

interface Farmacia {
  id: string;
  nombre: string;
}

interface FormDataType {
  correo: string;
  contraseña: string;
  farmacias: string[]; // Array de IDs de farmacias
  permisos: string[]; // Array de nombres de permisos
}

// --- DATOS DE EJEMPLO TIPADOS ---

const FARMACIAS_DISPONIBLES: Farmacia[] = [
  { id: "01", nombre: "Santa Elena" },
  { id: "02", nombre: "Sur America" },
  { id: "03", nombre: "Rapifarma" },
  { id: "04", nombre: "San Carlos" },
  { id: "05", nombre: "Las Alicias" },
  { id: "06", nombre: "San Martin" },
  { id: "07", nombre: "Milagro Norte" },
  { id: "08", nombre: "Virginia" },
  { id: "09", nombre: "Santo Tomas" },
];

const PERMISOS_DISPONIBLES: string[] = [
  "ver_inicio",
  "ver_about",
  "agregar_cuadre",
  "ver_resumen_mensual",
  "verificar_cuadres",
  "ver_cuadres_dia",
  "ver_resumen_dia",
  "acceso_admin",
  "eliminar_cuadres",
  "ver_ventas_totales",
  "verificar_gastos",
  "comisiones",
  "cajeros",
  "metas",
  "modificar_cuadre",
  "proveedores",
  "listas_comparativas",
  "orden_compra",
];

// --- COMPONENTE ---

const RegistroUsuario: React.FC = () => {
  const [formData, setFormData] = useState<FormDataType>({
    correo: "",
    contraseña: "",
    farmacias: [],
    permisos: [],
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Manejador genérico para inputs simples
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Manejador para la selección múltiple de farmacias
  const handleFarmaciaToggle = (farmaciaId: string) => {
    setFormData((prev) => {
      const isSelected = prev.farmacias.includes(farmaciaId);
      return {
        ...prev,
        farmacias: isSelected
          ? prev.farmacias.filter((id) => id !== farmaciaId)
          : [...prev.farmacias, farmaciaId],
      };
    });
  };

  // Manejador para la selección múltiple de permisos
  const handlePermisoToggle = (permiso: string) => {
    setFormData((prev) => {
      const isSelected = prev.permisos.includes(permiso);
      return {
        ...prev,
        permisos: isSelected
          ? prev.permisos.filter((p) => p !== permiso)
          : [...prev.permisos, permiso],
      };
    });
  };

  // --- LÓGICA DE ENVÍO AL BACKEND ACTUALIZADA ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // 1. Convertir la lista de IDs de farmacias a un objeto { "01": "Santa Elena", ... }
      const farmaciasObjeto: { [key: string]: string } = {};
      formData.farmacias.forEach((id) => {
        const farmacia = FARMACIAS_DISPONIBLES.find((f) => f.id === id);
        if (farmacia) {
          farmaciasObjeto[id] = farmacia.nombre;
        }
      });

      const dataToSend = {
        correo: formData.correo,
        contraseña: formData.contraseña,
        farmacias: farmaciasObjeto, // Enviar como objeto
        permisos: formData.permisos,
      };

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Opcional: Si este endpoint está protegido por JWT, necesitarías agregar:
          // 'Authorization': `Bearer ${token_del_admin}`
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Mostrar el detalle del error del backend (ej: "El correo ya está registrado.")
        throw new Error(
          errorData.detail || "Error desconocido al registrar usuario"
        );
      }

      // Registro exitoso
      const result = await response.json();
      console.log("Registro exitoso:", result);
      setSuccess(true);

      // Opcional: Limpiar el formulario después del éxito
      setFormData({
        correo: "",
        contraseña: "",
        farmacias: [],
        permisos: [],
      });
    } catch (err: any) {
      console.error("Error de registro:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex justify-center items-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 md:p-10">
        <h1 className="text-3xl font-extrabold text-gray-800 flex items-center mb-6 border-b pb-2">
          <AiOutlineUser className="mr-3 text-blue-600" />
          Registro de Nuevo Usuario
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* --- SECCIÓN 1: Datos de Acceso --- */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
              <AiOutlineMail className="mr-2 text-blue-500" />
              Credenciales
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label
                  className="block text-sm font-medium text-gray-600 mb-1"
                  htmlFor="correo"
                >
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="correo"
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-600 mb-1"
                  htmlFor="contraseña"
                >
                  Contraseña Temporal
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="contraseña"
                    name="contraseña"
                    value={formData.contraseña}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <AiOutlineLock className="absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* --- SECCIÓN 2: Asignación de Farmacias --- */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
              <AiOutlineShop className="mr-2 text-blue-500" />
              Farmacias Asignadas
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Selecciona las farmacias a las que este usuario tendrá acceso.
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {FARMACIAS_DISPONIBLES.map((farmacia) => (
                <button
                  key={farmacia.id}
                  type="button"
                  onClick={() => handleFarmaciaToggle(farmacia.id)}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                    formData.farmacias.includes(farmacia.id)
                      ? "bg-blue-600 text-white border-blue-700 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  {farmacia.id} - {farmacia.nombre}
                </button>
              ))}
            </div>
            {formData.farmacias.length === 0 && (
              <p className="text-red-500 text-sm mt-2">
                Debes seleccionar al menos una farmacia.
              </p>
            )}
          </div>

          {/* --- SECCIÓN 3: Permisos del Sistema --- */}
          <div>
            <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
              <AiOutlineSafety className="mr-2 text-blue-500" />
              Permisos de Acceso
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Define los módulos y acciones que el usuario podrá realizar.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {PERMISOS_DISPONIBLES.map((permiso) => (
                <div
                  key={permiso}
                  onClick={() => handlePermisoToggle(permiso)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    formData.permisos.includes(permiso)
                      ? "bg-indigo-100 border-indigo-500 text-indigo-800 shadow-sm"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    {permiso.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
            {formData.permisos.length === 0 && (
              <p className="text-red-500 text-sm mt-2">
                Debes asignar al menos un permiso.
              </p>
            )}
          </div>

          {/* --- Mensajes de Estado --- */}
          {error && (
            <div
              className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm"
              role="alert"
            >
              ❌ Error: {error}
            </div>
          )}
          {success && (
            <div
              className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm"
              role="alert"
            >
              ✅ ¡Usuario registrado exitosamente!
            </div>
          )}

          {/* --- Botón de Registro --- */}
          <div className="pt-6 border-t">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition-colors duration-300 text-lg disabled:opacity-50 flex items-center justify-center"
              disabled={
                !formData.correo ||
                !formData.contraseña ||
                formData.farmacias.length === 0 ||
                formData.permisos.length === 0 ||
                loading
              }
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Registrando...
                </>
              ) : (
                "Registrar Nuevo Usuario"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistroUsuario;
