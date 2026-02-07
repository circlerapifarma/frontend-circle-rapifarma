import { useEffect, useMemo, useState, useCallback } from "react";
import { UserForm } from "@/components/usuarios/UserForm";
import type { Usuario } from "@/Types";
import { UserPlus, Users, AlertCircle, XCircle, Search } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type LoadingState = {
  list: boolean;
  mutate: boolean;
};

export function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ list: false, mutate: false });
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const handleSetListLoading = (value: boolean) =>
    setLoading((prev) => ({ ...prev, list: value }));

  const handleSetMutateLoading = (value: boolean) =>
    setLoading((prev) => ({ ...prev, mutate: value }));

  const fetchUsuarios = useCallback(async () => {
    handleSetListLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/usuarios`);
      if (!res.ok) {
        throw new Error("No se pudo obtener la lista de usuarios.");
      }
      const data: Usuario[] = await res.json();
      setUsuarios(data);
    } catch (err: any) {
      console.error("Fetch usuarios error:", err);
      setError(err.message || "Error al obtener usuarios.");
    } finally {
      handleSetListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return usuarios;

    return usuarios.filter((u) => {
      const correo = u.correo?.toLowerCase() ?? "";
      const coincideCorreo = correo.includes(termino);

      const farmaciasValues = Object.values(u.farmacias ?? {});
      const coincideFarmacia = farmaciasValues.some((nombre) =>
        nombre.toLowerCase().includes(termino)
      );

      const farmaciasKeys = Object.keys(u.farmacias ?? {});
      const coincideIdFarmacia = farmaciasKeys.some((id) =>
        id.toLowerCase().includes(termino)
      );

      return coincideCorreo || coincideFarmacia || coincideIdFarmacia;
    });
  }, [busqueda, usuarios]);

  const handleCreate = async (userData: Usuario) => {
    handleSetMutateLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...userData, nombre: "" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al crear usuario.");
      }

      await fetchUsuarios();
    } catch (err: any) {
      console.error("Create user error:", err);
      setError(err.message || "Error al crear usuario.");
    } finally {
      handleSetMutateLoading(false);
    }
  };

  const handleUpdate = async (userData: Usuario) => {
    if (!userData._id) {
      setError("No se puede actualizar un usuario sin ID.");
      return;
    }

    handleSetMutateLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/usuarios/${userData._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(userData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Error al actualizar el usuario.");
      }

      setEditandoId(null);
      await fetchUsuarios();
    } catch (err: any) {
      console.error("Update user error:", err);
      setError(err.message || "Error desconocido al actualizar usuario.");
    } finally {
      handleSetMutateLoading(false);
    }
  };

  const handleClearSearch = () => setBusqueda("");

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 bg-gray-50 min-h-screen">
      <header className="flex items-center gap-3 mb-8">
        <Users className="text-blue-600" size={32} />
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
          Gestión de Usuarios
        </h1>
      </header>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Sección de creación */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4 text-blue-700 font-semibold">
          <UserPlus size={20} />
          <h2>Registrar Nuevo Colaborador</h2>
        </div>

        <UserForm
          user={{ correo: "", farmacias: {}, permisos: [] }}
          onSubmit={handleCreate}
          submitLabel={loading.mutate ? "Creando..." : "Crear Usuario"}
          loading={loading.mutate}
        />
      </section>

      {/* Lista de usuarios */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-700">Usuarios Activos</h2>
          {loading.list && (
            <span className="text-xs text-gray-500">Cargando usuarios...</span>
          )}
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 sm:text-sm transition-all shadow-sm"
            placeholder="Buscar por correo, nombre de farmacia o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="mt-2 px-2 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Mostrando{" "}
            <span className="font-bold text-gray-700">
              {usuariosFiltrados.length}
            </span>{" "}
            de {usuarios.length} usuarios
          </p>
          {busqueda && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              Filtro activo
            </span>
          )}
        </div>

        {/* Lista / estado vacío */}
        <div className="mt-4 grid gap-4">
          {!loading.list && usuariosFiltrados.length === 0 && (
            <p className="text-sm text-gray-500">
              No se encontraron usuarios con el criterio especificado.
            </p>
          )}

          {usuariosFiltrados.map((u) => (
            <div key={u._id}>
              {editandoId === u._id ? (
                <UserForm
                  user={u}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditandoId(null)}
                  submitLabel={loading.mutate ? "Actualizando..." : "Actualizar"}
                  loading={loading.mutate}
                />
              ) : (
                <UserCard user={u} onEdit={() => setEditandoId(u._id!)} />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type UserCardProps = {
  user: Usuario;
  onEdit: () => void;
};

function UserCard({ user, onEdit }: UserCardProps) {
  const permisosLimpios = useMemo(
    () =>
      (user.permisos ?? []).map((p) =>
        p.startsWith("ver_") ? p.replace("ver_", "") : p
      ),
    [user.permisos]
  );

  return (
    <article className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
      <div>
        <h3 className="font-bold text-gray-800 text-lg break-all">
          {user.correo}
        </h3>

        <div className="text-sm text-gray-500 mt-1">
          <span className="font-semibold text-blue-600">Farmacias:</span>{" "}
          {Object.values(user.farmacias ?? {}).join(", ") || "Sin asignar"}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {permisosLimpios.length > 0 ? (
            permisosLimpios.map((p) => (
              <span
                key={p}
                className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 border uppercase"
              >
                {p}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-gray-400">
              Sin permisos asignados
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
      >
        Editar Perfil
      </button>
    </article>
  );
}
