import React, { useEffect, useState } from "react";

interface Usuario {
  _id?: string;
  correo: string;
  nombre?: string;
  contraseña?: string;
  farmacias: Record<string, string>;
  permisos: string[];
  esAdministrativo?: boolean;
}

interface Farmacia {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PERMISOS = [
  "ver_inicio",
  "ver_about",
  "agregar_cuadre",
  "ver_resumen_mensual",
  "ver_ventas_totales",
  "verificar_cuadres",
  "ver_cuadres_dia",
  "verificar_gastos",
  "proveedores",
  "listas_comparativas",
  "orden_compra",
  "cajeros",
  "comisiones",
  "acceso_admin",
  "gestionar_usuarios",
  "ver_inventarios",
  "gestionar_cuentas_por_pagar",
  "bancos",
  "estadisticas"
];

const UsuariosAdminPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [nuevo, setNuevo] = useState<Usuario>({ correo: "", nombre: "", contraseña: "", farmacias: {}, permisos: [], esAdministrativo: false });
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función helper para verificar si el token es válido
  const isTokenValid = (): boolean => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    
    try {
      // Decodificar el token (sin verificar firma, solo para ver expiración)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convertir a milisegundos
      return Date.now() < exp;
    } catch (e) {
      return false;
    }
  };

  // Función helper para redirigir al login
  const redirectToLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      
      if (!token || !isTokenValid()) {
        redirectToLogin();
        return;
      }

      const res = await fetch(`${API_BASE_URL}/adminusuarios`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      // Verificar si la respuesta es exitosa
      if (!res.ok) {
        if (res.status === 401) {
          // Token inválido o expirado - redirigir al login
          redirectToLogin();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`);
      }

      // Parsear la respuesta
      const data = await res.json();
      
      // Verificar que sea un array antes de usar .map()
      if (Array.isArray(data)) {
        console.log("Usuarios recibidos:", data);
        // Asegurar que todos los usuarios tengan los campos necesarios
        const usuariosNormalizados = data.map((u: any) => ({
          _id: u._id || u.id,
          correo: u.correo || "",
          nombre: u.nombre || "",
          farmacias: u.farmacias || {},
          permisos: Array.isArray(u.permisos) ? u.permisos : [],
          esAdministrativo: u.esAdministrativo !== undefined ? u.esAdministrativo : false
        }));
        setUsuarios(usuariosNormalizados);
      } else {
        console.error("La respuesta no es un array:", data);
        setError("Error: La respuesta del servidor no es válida");
        setUsuarios([]);
      }
    } catch (err: any) {
      console.error("Error al obtener usuarios:", err);
      setError(err.message || "Error al obtener usuarios");
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchFarmacias();
  }, []);

  const fetchFarmacias = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/farmacias`);
      const data = await res.json();
      const lista = data.farmacias
        ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
        : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
      setFarmacias(lista);
    } catch (err: any) {
      console.error("Error al obtener farmacias:", err);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, key: keyof Usuario, isEdit = false) => {
    const value = e.target.value;
    if (isEdit && editando) {
      setEditando({ ...editando, [key]: value });
    } else if (!isEdit) {
      setNuevo({ ...nuevo, [key]: value });
    }
  };

  const handlePermisoChange = (permiso: string, isEdit = false) => {
    if (isEdit && editando) {
      setEditando({
        ...editando,
        permisos: editando.permisos.includes(permiso)
          ? editando.permisos.filter(p => p !== permiso)
          : [...editando.permisos, permiso]
      });
    } else if (!isEdit) {
      setNuevo({
        ...nuevo,
        permisos: nuevo.permisos.includes(permiso)
          ? nuevo.permisos.filter(p => p !== permiso)
          : [...nuevo.permisos, permiso]
      });
    }
  };

  const handleGuardar = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      
      if (!token || !isTokenValid()) {
        redirectToLogin();
        return;
      }

      // Filtrar permisos para solo incluir los válidos
      const permisosValidos = nuevo.permisos.filter(p => PERMISOS.includes(p));

      // Preparar datos del usuario
      let farmaciasUsuario: Record<string, string> = {};
      if (nuevo.esAdministrativo) {
        // Si es administrativo, incluir todas las farmacias
        farmacias.forEach(f => {
          farmaciasUsuario[f.id] = f.nombre;
        });
      } else {
        // Si no es administrativo, solo la farmacia seleccionada
        if (farmaciaSeleccionada) {
          const farmacia = farmacias.find(f => f.id === farmaciaSeleccionada);
          if (farmacia) {
            farmaciasUsuario[farmacia.id] = farmacia.nombre;
          }
        }
      }

      const usuarioData: Usuario = {
        ...nuevo,
        permisos: permisosValidos, // Solo enviar permisos válidos
        farmacias: farmaciasUsuario
      };

      const res = await fetch(`${API_BASE_URL}/usuarios`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(usuarioData)
      });

      if (!res.ok) {
        if (res.status === 401) {
          redirectToLogin();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`);
      }

      setNuevo({ correo: "", nombre: "", contraseña: "", farmacias: {}, permisos: [], esAdministrativo: false });
      setFarmaciaSeleccionada("");
      await fetchUsuarios();
    } catch (err: any) {
      console.error("Error al crear usuario:", err);
      setError(err.message || "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleActualizar = async () => {
    if (!editando?._id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      
      if (!token || !isTokenValid()) {
        redirectToLogin();
        return;
      }

      // Filtrar permisos para solo incluir los válidos
      const permisosValidos = editando.permisos.filter(p => PERMISOS.includes(p));

      // Preparar datos para actualizar (sin contraseña si está vacía)
      // Si es administrativo, asegurar que tenga todas las farmacias
      let farmaciasActualizacion: Record<string, string> = editando.farmacias;
      if (editando.esAdministrativo) {
        farmaciasActualizacion = {};
        farmacias.forEach(f => {
          farmaciasActualizacion[f.id] = f.nombre;
        });
      }

      const datosActualizacion: any = {
        correo: editando.correo,
        nombre: editando.nombre,
        farmacias: farmaciasActualizacion,
        permisos: permisosValidos, // Solo enviar permisos válidos
        esAdministrativo: editando.esAdministrativo
      };

      // Solo incluir contraseña si tiene valor
      if (editando.contraseña && editando.contraseña.trim() !== "") {
        datosActualizacion.contraseña = editando.contraseña;
      }

      const res = await fetch(`${API_BASE_URL}/usuarios/${editando._id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datosActualizacion)
      });

      if (!res.ok) {
        if (res.status === 401) {
          redirectToLogin();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`);
      }

      // Si el usuario actualizado es el mismo que está logueado, actualizar localStorage
      const usuarioActual = JSON.parse(localStorage.getItem("usuario") || "null");
      if (usuarioActual && usuarioActual.correo === editando.correo) {
        const usuarioActualizado = {
          ...usuarioActual,
          permisos: permisosValidos,
          nombre: editando.nombre,
          farmacias: editando.farmacias,
          esAdministrativo: editando.esAdministrativo
        };
        localStorage.setItem("usuario", JSON.stringify(usuarioActualizado));
        // Disparar evento personalizado para que el Navbar se actualice
        window.dispatchEvent(new Event("localStorageChange"));
      }

      setEditando(null);
      await fetchUsuarios();
    } catch (err: any) {
      console.error("Error al actualizar usuario:", err);
      setError(err.message || "Error al actualizar usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm("¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      
      if (!token || !isTokenValid()) {
        redirectToLogin();
        return;
      }

      const res = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          redirectToLogin();
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`);
      }

      await fetchUsuarios();
    } catch (err: any) {
      console.error("Error al eliminar usuario:", err);
      setError(err.message || "Error al eliminar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Administrar Usuarios</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="mb-8 border p-4 rounded-lg bg-blue-50">
        <h2 className="font-semibold mb-2">Crear nuevo usuario</h2>
        <div className="flex flex-col gap-2 mb-2">
          <input type="text" placeholder="Nombre" value={nuevo.nombre || ""} onChange={e => handleInput(e, "nombre")}
            className="border rounded px-2 py-1" />
          <input type="email" placeholder="Correo" value={nuevo.correo} onChange={e => handleInput(e, "correo")}
            className="border rounded px-2 py-1" />
          <input type="password" placeholder="Contraseña" value={nuevo.contraseña || ""} onChange={e => handleInput(e, "contraseña")}
            className="border rounded px-2 py-1" />
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tipo de Usuario</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="tipoUsuario" 
                  checked={nuevo.esAdministrativo === true}
                  onChange={() => {
                    // Cuando es administrativo, incluir todas las farmacias
                    const todasLasFarmacias: Record<string, string> = {};
                    farmacias.forEach(f => {
                      todasLasFarmacias[f.id] = f.nombre;
                    });
                    setNuevo({ ...nuevo, esAdministrativo: true, farmacias: todasLasFarmacias });
                    setFarmaciaSeleccionada("");
                  }}
                  className="cursor-pointer"
                />
                <span className="text-sm">Administrativo</span>
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="tipoUsuario" 
                  checked={nuevo.esAdministrativo === false}
                  onChange={() => {
                    setNuevo({ ...nuevo, esAdministrativo: false });
                    setFarmaciaSeleccionada("");
                  }}
                  className="cursor-pointer"
                />
                <span className="text-sm">Farmacia</span>
              </label>
            </div>
          </div>

          {nuevo.esAdministrativo === false && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Farmacia</label>
              <select
                value={farmaciaSeleccionada}
                onChange={(e) => setFarmaciaSeleccionada(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                required={nuevo.esAdministrativo === false}
              >
                <option value="">Seleccione una farmacia</option>
                {farmacias.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {nuevo.esAdministrativo === true && (
            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              Usuario administrativo: Tendrá acceso a todas las farmacias según los permisos asignados.
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600">Permisos</label>
            <div className="flex flex-wrap gap-2">
              {PERMISOS.map(p => (
                <label key={p} className="flex items-center gap-1">
                  <input type="checkbox" checked={nuevo.permisos.includes(p)} onChange={() => handlePermisoChange(p)} />
                  <span className="text-xs">{p}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded mt-2" onClick={handleGuardar} disabled={loading}>Crear usuario</button>
      </div>
      <h2 className="font-semibold mb-2">Usuarios existentes</h2>
      {loading ? <div>Cargando...</div> : (
        <div className="space-y-4">
          {usuarios.map(u => (
            <div key={u._id} className="border p-3 rounded-lg bg-white flex flex-col gap-1">
              {editando?._id === u._id ? (
                <>
                  <input type="text" placeholder="Nombre" value={editando?.nombre ?? ""} onChange={e => handleInput(e, "nombre", true)} className="border rounded px-2 py-1" />
                  <input type="email" value={editando?.correo ?? ""} onChange={e => handleInput(e, "correo", true)} className="border rounded px-2 py-1" />
                  <input type="password" placeholder="Nueva contraseña (dejar vacío para mantener)" value={editando?.contraseña ?? ""} onChange={e => handleInput(e, "contraseña", true)} className="border rounded px-2 py-1" />
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tipo de Usuario</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={`tipoUsuarioEdit-${u._id}`}
                          checked={editando?.esAdministrativo === true}
                          onChange={() => {
                            // Cuando es administrativo, incluir todas las farmacias
                            const todasLasFarmacias: Record<string, string> = {};
                            farmacias.forEach(f => {
                              todasLasFarmacias[f.id] = f.nombre;
                            });
                            setEditando(editando ? { ...editando, esAdministrativo: true, farmacias: todasLasFarmacias } : null);
                          }}
                          className="cursor-pointer"
                        />
                        <span className="text-sm">Administrativo</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={`tipoUsuarioEdit-${u._id}`}
                          checked={editando?.esAdministrativo === false}
                          onChange={() => {
                            setEditando(editando ? { ...editando, esAdministrativo: false } : null);
                          }}
                          className="cursor-pointer"
                        />
                        <span className="text-sm">Farmacia</span>
                      </label>
                    </div>
                  </div>

                  {editando?.esAdministrativo === false && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Farmacia</label>
                      <select
                        value={Object.keys(editando?.farmacias || {})[0] || ""}
                        onChange={(e) => {
                          const farmaciaId = e.target.value;
                          const farmaciaNombre = farmacias.find(f => f.id === farmaciaId)?.nombre || "";
                          setEditando(editando ? { 
                            ...editando, 
                            farmacias: farmaciaId ? { [farmaciaId]: farmaciaNombre } : {} 
                          } : null);
                        }}
                        className="border rounded px-2 py-1 w-full"
                      >
                        <option value="">Seleccione una farmacia</option>
                        {farmacias.map(f => (
                          <option key={f.id} value={f.id}>{f.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {PERMISOS.map(p => (
                      <label key={p} className="flex items-center gap-1">
                        <input type="checkbox" checked={!!editando?.permisos?.includes(p)} onChange={() => handlePermisoChange(p, true)} />
                        <span className="text-xs">{p}</span>
                      </label>
                    ))}
                  </div>
                  <button className="bg-green-600 text-white px-3 py-1 rounded mt-2" onClick={handleActualizar} disabled={loading}>Guardar</button>
                  <button className="bg-gray-400 text-white px-3 py-1 rounded mt-2 ml-2" onClick={() => setEditando(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <div><b>Nombre:</b> {u.nombre || "Sin nombre"}</div>
                  <div><b>Correo:</b> {u.correo}</div>
                  <div><b>Tipo:</b> {u.esAdministrativo ? "Administrativo" : "Farmacia"}</div>
                  {u.esAdministrativo ? (
                    <div>
                      <b>Farmacias:</b> Todas ({Object.keys(u.farmacias || {}).length} farmacias)
                      {Object.keys(u.farmacias || {}).length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          {Object.entries(u.farmacias || {}).map(([id, nombre]) => `${nombre} (${id})`).join(", ")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div><b>Farmacia:</b> {Object.entries(u.farmacias || {}).map(([id, nombre]) => `${nombre} (${id})`).join(", ") || "Sin farmacia asignada"}</div>
                  )}
                  <div>
                    <b>Permisos:</b>
                    {u.permisos && u.permisos.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {u.permisos.map((permiso: string) => (
                          <span key={permiso} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {permiso}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500"> Sin permisos</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="bg-yellow-500 text-white px-3 py-1 rounded" onClick={() => setEditando(u)}>Editar</button>
                    <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={() => u._id && handleEliminar(u._id)}>Eliminar</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsuariosAdminPage;
