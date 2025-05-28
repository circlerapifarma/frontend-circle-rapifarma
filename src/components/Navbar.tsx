import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';

const allLinks = [
  { to: '/resumenfarmacias', label: 'Resumen de Ventas', permiso: 'ver_resumen_mensual' },
  { to: '/ventatotal', label: 'Venta Total', permiso: 'ver_ventas_totales' },
  { to: '/agregarcuadre', label: 'Agregar Cuadre', permiso: 'agregar_cuadre' },
  { to: '/cuadresporfarmacia', label: 'Mis Cuadres', permiso: 'agregar_cuadre' },
  { to: '/verificacion-cuadres', label: 'Verificación Cuadres', permiso: 'verificar_cuadres' },
  { to: '/ver-cuadres-dia', label: 'Cuadres por Día', permiso: 'ver_cuadres_dia' },
  { to: '/verificaciongastos', label: 'Verificación Gastos', permiso: 'verificar_gastos' },
  { to: '/agregargastos', label: 'Agregar Gasto', permiso: 'agregar_cuadre' },
  { to: '/gastosporusuario', label: 'Mis Gastos', permiso: 'agregar_cuadre' },
  { to: '/cajeros', label: 'Cajeros', permiso: 'acceso_admin' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [permisosUsuario, setPermisosUsuario] = useState<string[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const storedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    setUsuario(storedUsuario);
    setPermisosUsuario(storedUsuario?.permisos || []);

    const handleStorageChange = () => {
      const updatedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
      setUsuario(updatedUsuario);
      setPermisosUsuario(updatedUsuario?.permisos || []);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const links = allLinks.filter(link => !link.permiso || permisosUsuario.includes(link.permiso));

  return (
    <nav className="bg-white border-b border-gray-200 shadow-md px-6 py-4 sticky top-0 z-50">
      <div className="flex justify-between items-center">
        <div className="text-xl font-bold text-transparent bg-gradient-to-r from-green-600 via-blue-500 to-blue-700 bg-clip-text">
          GRUPO DROCOLVEN
        </div>

        <button
          className="sm:hidden text-gray-700"
          onClick={() => setOpen(prev => !prev)}
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-all duration-150 pb-1 ${
                location.pathname === link.to
                  ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                  : 'text-gray-600 hover:text-blue-600 hover:border-b-2 hover:border-blue-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {usuario && (
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = '/login';
              }}
              className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm transition"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {/* Menú móvil */}
      {open && (
        <div className="sm:hidden mt-4 flex flex-col gap-3">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`text-sm transition-all duration-150 ${
                location.pathname === link.to
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {usuario && (
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = '/login';
              }}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm transition"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
