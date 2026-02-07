import { Save, Mail, Lock, Store } from "lucide-react";
import { PermissionSelector } from "./SelectorPermisos";
import { useEffect, useState, type FormEvent } from "react";
import type { Usuario } from "@/Types";
import { SelectorFarmacia } from "./SelectorFarmacia";

interface UserFormProps {
  user: Usuario;
  onSubmit: (user: Usuario) => void;
  onCancel?: () => void;
  submitLabel: string;
  loading: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type FormErrors = {
  correo?: string;
  contraseña?: string;
};

export const UserForm = ({
  user,
  onSubmit,
  onCancel,
  submitLabel,
  loading,
}: UserFormProps) => {
  const [localUser, setLocalUser] = useState<Usuario>(user);
  const [errors, setErrors] = useState<FormErrors>({});

  const [masterFarmacias, setMasterFarmacias] = useState<
    { id: string; nombre: string }[]
  >([]);

  const fetchMasterFarmacias = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/farmacias`);
      const data = await res.json();

      const lista = Object.entries(data.farmacias || {})
        .map(([id, nombre]) => ({
          id,
          nombre: String(nombre),
        }))
        .sort((a, b) =>
          a.id.localeCompare(b.id, undefined, { numeric: true })
        );

      setMasterFarmacias(lista);
    } catch (error) {
      console.error("Error cargando catálogo de farmacias", error);
    }
  };

  useEffect(() => {
    fetchMasterFarmacias();
  }, []);

  // Si cambian las props (p.e. entras en modo edición), sincroniza el estado local
  useEffect(() => {
    setLocalUser(user);
    setErrors({});
  }, [user]);

  const togglePermiso = (permiso: string) => {
    const current = localUser.permisos || [];
    const nuevos = current.includes(permiso)
      ? current.filter((p) => p !== permiso)
      : [...current, permiso];

    setLocalUser({ ...localUser, permisos: nuevos });
  };

  const validate = (values: Usuario): FormErrors => {
    const newErrors: FormErrors = {};

    const correo = (values.correo || "").trim();
    const contraseña = values.contraseña || "";

    // Validación de correo
    if (!correo) {
      newErrors.correo = "El correo es obligatorio.";
    } else {
      // Regex sencilla para email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        newErrors.correo = "Formato de correo no válido.";
      }
    }

    // Validación de contraseña (solo en creación o si se está editando y escribió algo)
    if (!values._id) {
      // Creación: siempre requerido
      if (!contraseña) {
        newErrors.contraseña = "La contraseña es obligatoria.";
      } else if (contraseña.length < 6) {
        newErrors.contraseña =
          "La contraseña debe tener al menos 6 caracteres.";
      }
    } else if (contraseña) {
      // Edición: solo validar si escribió algo
      if (contraseña.length < 6) {
        newErrors.contraseña =
          "La contraseña debe tener al menos 6 caracteres.";
      }
    }

    return newErrors;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate(localUser);
    setErrors(validationErrors);

    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) return;

    onSubmit(localUser);
  };

  const handleCorreoChange = (value: string) => {
    const updatedUser = { ...localUser, correo: value };
    setLocalUser(updatedUser);

    // Validación onChange ligera (opcional, se puede hacer solo en submit)
    if (errors.correo) {
      const { correo, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handlePasswordChange = (value: string) => {
    const updatedUser = { ...localUser, contraseña: value };
    setLocalUser(updatedUser);

    if (errors.contraseña) {
      const { contraseña, ...rest } = errors;
      setErrors(rest);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-5 rounded-xl shadow-sm border border-blue-100"
      noValidate
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Correo */}
        <div className="relative">
          <Mail className="absolute left-2 top-2.5 text-gray-400" size={18} />
          <input
            type="email"
            className={`pl-9 w-full border rounded-lg py-2 focus:ring-2 focus:ring-blue-200 outline-none ${
              errors.correo ? "border-red-400" : "border-gray-300"
            }`}
            placeholder="Correo electrónico"
            value={localUser.correo || ""}
            onChange={(e) => handleCorreoChange(e.target.value)}
          />
          {errors.correo && (
            <p className="mt-1 text-xs text-red-500">{errors.correo}</p>
          )}
        </div>

        {/* Contraseña */}
        <div className="relative">
          <Lock className="absolute left-2 top-2.5 text-gray-400" size={18} />
          <input
            type="password"
            minLength={6}
            className={`pl-9 w-full border rounded-lg py-2 focus:ring-2 focus:ring-blue-200 outline-none ${
              errors.contraseña ? "border-red-400" : "border-gray-300"
            }`}
            placeholder={
              localUser._id ? "Nueva contraseña (opcional)" : "Contraseña"
            }
            value={localUser.contraseña || ""}
            onChange={(e) => handlePasswordChange(e.target.value)}
          />
          {errors.contraseña && (
            <p className="mt-1 text-xs text-red-500">{errors.contraseña}</p>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1 text-xs font-bold text-gray-500 mb-2 uppercase">
          <Store size={14} /> Farmacias Asignadas
        </label>
        <SelectorFarmacia
          available={masterFarmacias}
          selected={localUser.farmacias}
          onChange={(nuevasFarmacias) =>
            setLocalUser({ ...localUser, farmacias: nuevasFarmacias })
          }
        />
      </div>

      <PermissionSelector
        selected={localUser.permisos || []}
        onChange={togglePermiso}
      />

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} /> {submitLabel}
        </button>
      </div>
    </form>
  );
};
