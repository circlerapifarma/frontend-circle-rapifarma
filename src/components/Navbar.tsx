import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router";
import { AnimatePresence } from "framer-motion";

import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  Home,
  BarChart,
  DollarSign,
  Users,
  Settings,
  Briefcase,
  CreditCard,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useProveedores } from "@/hooks/useProveedores";

interface LinkItem {
  to: string;
  label: string;
  permiso?: string;
  showCount?: boolean;
}

interface LinkCategory {
  category: string;
  icon: any;
  items: LinkItem[];
}

// Permisos y enlaces agrupados para una mejor organización visual
const allLinks: LinkCategory[] = [
  {
    category: "Inicio",
    icon: Home,
    items: [{ to: "/", label: "Panel de Control", permiso: "acceso_admin" }],
  },
  {
    category: "Análisis y Métricas",
    icon: BarChart,
    items: [
      { to: "/gastoscxc-cuadres", label: "Balance Consolidado", permiso: "agregar_cuadre" },
      { to: "/resumenfarmacias", label: "Resumen de Ventas", permiso: "ver_resumen_mensual" },
      { to: "/ventatotal", label: "Ventas Totales", permiso: "ver_ventas_totales" },
      { to: "/estadisticas/mensuales", label: "Comparativa Mensual", permiso: "estadisticas" },
      { to: "/metas", label: "Mis Metas", permiso: "ver_about" },
      { to: "/gestionmetas", label: "Gestión de Metas", permiso: "metas" },
      { to: "/metasconf", label: "Configuración de Metas", permiso: "ver_about" },
    ],
  },
  {
    category: "Cuadres",
    icon: ClipboardCheck, // Sugerencia de cambio de icono para diferenciar de Análisis
    items: [
      { to: "/agregarcuadre", label: "Agregar Cuadre", permiso: "agregar_cuadre" },
      { to: "/cuadresporfarmacia", label: "Mis Registros", permiso: "agregar_cuadre" },
      { to: "/verificacion-cuadres", label: "Validación de Cuadres", permiso: "verificar_cuadres" },
      { to: "/ver-cuadres-dia", label: "Cierres Diarios", permiso: "ver_cuadres_dia" },
      { to: "/visualizarcuadres", label: "Visualizar Cuadres", permiso: "ver_cuadres_dia" },
      { to: "/cuadres/denegados", label: "Cuadres Rechazados", permiso: "" },
      { to: "/modificar-cuadre", label: "Edición de Cuadres", permiso: "modificar_cuadre" },
    ],
  },
  {
    category: "Gastos",
    icon: DollarSign,
    items: [
      { to: "/agregargastos", label: "Agregar Gasto", permiso: "agregar_cuadre" },
      { to: "/gastosporusuario", label: "Mis Gastos", permiso: "agregar_cuadre" },
      { to: "/verificaciongastos", label: "Verificación de Gastos", permiso: "verificar_gastos" },
      { to: "/vergastos", label: "Visualizar Gastos", permiso: "verificar_gastos" },
    ],
  },
  {
    category: "Cuentas Por Pagar",
    icon: CreditCard, // Icono más acorde a pagos que 'Users'
    items: [
      { to: "/cuentasporpagar", label: "Agregar Cuenta Por Pagar", permiso: "agregar_cuadre" },
      { to: "/vercuentasporpagar", label: "Visualizar Cuentas por Pagar", permiso: "verificar_gastos" },
      { to: "/verificacioncuentasporpagar", label: "Verificación Cuentas Por Pagar", permiso: "verificar_gastos" },
      { to: "/pagoscpp", label: "Historial de Pagos", permiso: "verificar_gastos" },
    ],
  },
  {
    category: "Talento Humano",
    icon: Users,
    items: [
      { to: "/cajeros", label: "Gestión de Vendedores", permiso: "cajeros" },
      { to: "/comisiones", label: "Comisiones por Turno", permiso: "comisiones" },
      { to: "/comisionesgenerales", label: "Comisiones Generales", permiso: "comisiones" },
    ],
  },
  {
    category: "Operaciones",
    icon: Briefcase,
    items: [
      { to: "/proveedores", label: "Catálogo de Proveedores", permiso: "proveedores", showCount: true },
      { to: "/bancos", label: "Entidades Bancarias", permiso: "bancos" },
      { to: "/listas-comparativas", label: "Listas de Precios", permiso: "listas_comparativas" },
      { to: "/orden-compra", label: "Órdenes de Compra", permiso: "orden_compra" },
      { to: "/valesporfarmacia", label: "Control de Vales", permiso: "ver_cuadres_dia" },
      { to: "/verinventarios", label: "Stock e Inventarios", permiso: "ver_inventarios" },
    ],
  },
  {
    category: "Configuración",
    icon: Settings,
    items: [
      { to: "/adminusuarios", label: "Gestión de Usuarios", permiso: "acceso_admin" },
    ],
  },
];

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [permisosUsuario, setPermisosUsuario] = useState<string[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [horaVenezuela, setHoraVenezuela] = useState<string>("");
  const [fechaVenezuela, setFechaVenezuela] = useState<string>("");
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { totalProveedores, fetchTotalProveedores } = useProveedores();

  // Actualizar hora de Venezuela en tiempo real
  useEffect(() => {
    const actualizarHora = () => {
      const ahora = new Date();
      // Venezuela está en UTC-4 (America/Caracas)
      const horaVenezuela = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Caracas" }));

      // Formatear hora: HH:MM:SS
      const horas = horaVenezuela.getHours().toString().padStart(2, "0");
      const minutos = horaVenezuela.getMinutes().toString().padStart(2, "0");
      const segundos = horaVenezuela.getSeconds().toString().padStart(2, "0");
      setHoraVenezuela(`${horas}:${minutos}:${segundos}`);

      // Formatear fecha: DD de MMMM de YYYY
      const opcionesFecha: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Caracas"
      };
      const fechaFormateada = ahora.toLocaleDateString("es-VE", opcionesFecha);
      setFechaVenezuela(fechaFormateada);
    };

    // Actualizar inmediatamente
    actualizarHora();

    // Actualizar cada segundo
    const interval = setInterval(actualizarHora, 1000);

    return () => clearInterval(interval);
  }, []);

  // Effect for handling user data and permissions from localStorage
  useEffect(() => {
    const loadUsuario = () => {
      try {
        const storedUsuario = JSON.parse(localStorage.getItem("usuario") || "null");
        setUsuario(storedUsuario);
        setPermisosUsuario(storedUsuario?.permisos || []);
      } catch (error) {
        console.error("Error al cargar usuario:", error);
      }
    };

    // Cargar usuario al montar
    loadUsuario();

    // Listener para cambios en otras pestañas
    const handleStorageChange = () => {
      loadUsuario();
    };

    // Listener para cambios en la misma pestaña (usando evento personalizado)
    const handleCustomStorageChange = () => {
      loadUsuario();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange);
    };
  }, []);

  // Effect para obtener el total de proveedores
  useEffect(() => {
    if (permisosUsuario.includes("proveedores")) {
      fetchTotalProveedores();
    }
  }, [permisosUsuario]);

  // Effect for handling clicks outside dropdown/mobile menu to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close desktop dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      // Close mobile menu if open and click is outside the menu and not on the toggle button
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        isMobileMenuOpen
      ) {
        const mobileButton = document.querySelector(
          '[aria-label="Toggle mobile menu"]'
        );
        if (mobileButton && !mobileButton.contains(event.target as Node)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Filter links based on user permissions
  const accessibleLinks = allLinks
    .map((category) => ({
      ...category,
      items: category.items.filter((link) => {
        // Si no tiene propiedad permiso, es visible para todos
        if (!("permiso" in link) || link.permiso === undefined || link.permiso === null || link.permiso === "") {
          return true;
        }
        // Si tiene acceso_admin, puede ver todo (incluyendo módulos de usuarios)
        if (permisosUsuario.includes("acceso_admin")) {
          return true;
        }
        // Si tiene el permiso específico, puede verlo
        return permisosUsuario.includes(link.permiso);
      }),
    }))
    .filter((category) => category.items.length > 0);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  };


  const [activeCategory, setActiveCategory] = useState(accessibleLinks[0]?.category);
  // Estado para controlar qué categoría está expandida en móvil
  const [expandedMobileCat, setExpandedMobileCat] = useState(null);

  const toggleMobileCategory = (category: any) => {
    setExpandedMobileCat(expandedMobileCat === category ? null : category);
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">

        {/* Logo Section */}
        <Link to="/admin" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 transition-transform group-hover:scale-110">
            <span className="text-white font-black text-xl leading-none">R</span>
          </div>
          <span className="text-lg sm:text-xl font-black tracking-tighter text-gray-800 uppercase">
            Rapifarma
          </span>
        </Link>

        {/* Reloj - Solo Desktop (MD+) */}
        <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-1.5 rounded-2xl border border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{fechaVenezuela}</span>
          <div className="w-[1px] h-3 bg-gray-200" />
          <span className="text-sm font-black text-blue-600 tabular-nums">{horaVenezuela}</span>
        </div>

        {/* Controles Derecha */}
        <div className="flex items-center gap-2">

          {/* DESKTOP DROPDOWN (SM+) */}
          <div className="hidden sm:block relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all border
                ${isDropdownOpen ? "bg-gray-900 text-white border-gray-900 shadow-xl" : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"}`}
            >
              MÓDULOS
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute right-0 mt-3 w-[650px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex h-112"
                >
                  {/* Selector Lateral Izquierdo */}
                  <div className="w-1/3 bg-gray-50/50 border-r border-gray-100 p-3 space-y-1">
                    {accessibleLinks.map((cat) => (
                      <button
                        key={cat.category}
                        onMouseEnter={() => setActiveCategory(cat.category)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                          ${activeCategory === cat.category
                            ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
                      >
                        {cat.icon && <cat.icon className="w-4 h-4" />}
                        <span className="truncate">{cat.category}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => handleLogout()}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all
                          text-red-600 hover:bg-gray-100`}
                    >
                      {<LogOut className="w-4 h-4" />}
                      <span className="truncate">Salir</span>
                    </button>
                    <div className="flex items-center py-2 w-full justify-center">
                      <span className="text-sm font-black text-gray-900">{usuario?.correo}</span>
                    </div>
                    <div className="w-full bg-gray-50/50 border-r border-gray-100 p-3 flex justify-end">

                    </div>
                  </div>

                  {/* Panel de Enlaces Derecho */}
                  <div className="w-2/3 p-6 bg-white overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="mb-4">
                      <h4 className="text-lg font-black text-gray-900 leading-none">{activeCategory}</h4>
                      <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-tighter">Accesos directos</p>
                    </div>

                    <div className="grid grid-cols-1 gap-1 flex-1">
                      {accessibleLinks.find(c => c.category === activeCategory)?.items.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setIsDropdownOpen(false)}
                          className="group flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 transition-colors"
                        >
                          <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">{link.label}</span>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MOBILE TOGGLE (Solo visible en < SM) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2.5 bg-gray-900 text-white rounded-xl shadow-lg"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-16 bg-white z-[60] sm:hidden flex flex-col h-[calc(100vh-64px)]"
          >
            {/* Reloj en móvil */}
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <span className="text-xs font-bold text-blue-900">{fechaVenezuela}</span>
              <span className="text-sm font-black text-blue-600 tabular-nums">{horaVenezuela}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {accessibleLinks.map((category) => (
                <div key={category.category} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleMobileCategory(category.category)}
                    className={`w-full flex items-center justify-between p-4 text-sm font-black uppercase tracking-tight
                      ${expandedMobileCat === category.category ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
                  >
                    <div className="flex items-center gap-3">
                      {category.icon && <category.icon className="w-4 h-4" />}
                      {category.category}
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMobileCat === category.category ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {expandedMobileCat === category.category && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-gray-50"
                      >
                        <div className="p-2 grid grid-cols-1 gap-1">
                          {category.items.map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`p-3 rounded-xl text-sm font-bold flex items-center justify-between
                                ${location.pathname === link.to ? "text-blue-600 bg-blue-50" : "text-gray-600"}`}
                            >
                              {link.label}
                              {link.showCount && (
                                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                  {totalProveedores}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer Móvil */}
            <div className="p-2 border-t border-gray-100 bg-white">
              <button
                onClick={handleLogout}
                className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-black text-sm flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> CERRAR SESIÓN
              </button>
            </div>
            <div className="flex items-center mb-2 w-full justify-center">
              <span className="text-sm font-black text-gray-900">{usuario?.correo}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
