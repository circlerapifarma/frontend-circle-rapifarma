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
  { to: '/cajeros', label: 'Vendedores', permiso: 'acceso_admin' },
  { to: '/comisiones', label: 'Comisiones Por Turno', permiso: 'acceso_admin' },
  { to: '/comisionesgenerales', label: 'Comisiones Generales', permiso: 'acceso_admin' },
  { to: '/cuentasporpagar', label: 'Cuentas por Pagar', permiso: 'acceso_admin' },
  { to: '/vercuentasporpagar', label: 'Ver Cuentas por Pagar', permiso: 'acceso_admin' },
  { to: '/vergastos', label: 'Ver Gastos', permiso: 'acceso_admin' },
  { to: '/visualizarcuadres', label: 'Visualizar Cuadres', permiso: 'acceso_admin' },
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

        <div className="hidden sm:flex items-center gap-6 relative">
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm font-semibold text-blue-700"
              tabIndex={0}
            >
              Menú
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity duration-150">
              <ul className="py-2 max-h-96 overflow-y-auto">
                {links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={`block px-4 py-2 text-sm whitespace-nowrap transition-all duration-150 ${
                        location.pathname === link.to
                          ? 'text-blue-600 font-semibold bg-blue-50'
                          : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {usuario && (
                  <li>
                    <button
                      onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('usuario');
                        window.location.href = '/login';
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Cerrar sesión
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {open && (
        <div className="sm:hidden mt-4 flex flex-row flex-wrap gap-2 max-h-[70vh] overflow-y-auto border rounded shadow bg-white p-2">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`px-3 py-2 text-sm whitespace-nowrap transition-all duration-150 rounded ${
                location.pathname === link.to
                  ? 'text-blue-600 font-semibold bg-blue-50'
                  : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
              }`}
              style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}
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
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
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
