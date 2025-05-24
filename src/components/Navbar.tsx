import { useEffect, useState } from 'react';
import { Link } from 'react-router';

const allLinks = [
  { to: '/agregarcuadre', label: 'Agregar Cuadre', permiso: 'agregar_cuadre' },
  { to: '/resumenfarmacias', label: 'Resumen Mensual', permiso: 'ver_resumen_mensual' },
  { to: '/verificacion-cuadres', label: 'Verificación Cuadres', permiso: 'verificar_cuadres' },
  { to: '/ver-cuadres-dia', label: 'Cuadres por Día', permiso: 'ver_cuadres_dia' },
  { to: '/resumenfarmacias-dia', label: 'Resumen por Día', permiso: 'ver_resumen_dia' },
  { to: '/ventatotal', label: 'Venta Total', permiso: 'ver_ventas_totales' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [permisosUsuario, setPermisosUsuario] = useState<string[]>([]);
  const [usuario, setUsuario] = useState<any>(null);

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
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="">
          <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded-full bg-white" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-green-600 via-blue-500 to-blue-700 bg-clip-text text-transparent tracking-wide">
          GRUPO DROCOLVEN
        </span>
      </div>

        <button
          className="sm:hidden text-gray-700 focus:outline-none"
          onClick={() => setOpen(prev => !prev)}
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:flex gap-6 items-center">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-gray-600 hover:text-black transition-colors"
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
              className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="flex flex-col sm:hidden mt-4 gap-3">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-gray-600 hover:text-black transition-colors"
              onClick={() => setOpen(false)}
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
              className="mt-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
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
