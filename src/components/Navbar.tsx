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

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    setPermisosUsuario(usuario?.permisos || []);

    const handleStorageChange = () => {
      const updatedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
      setPermisosUsuario(updatedUsuario?.permisos || []);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const links = allLinks.filter(link => !link.permiso || permisosUsuario.includes(link.permiso));

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-800">RF</div>

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
        </div>
      )}
    </nav>
  );
};

export default Navbar;
