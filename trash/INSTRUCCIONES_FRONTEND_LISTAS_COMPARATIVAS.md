# Instrucciones Frontend: Listas Comparativas - Optimizaciones Opcionales

## Resumen

El backend ya está optimizado y funcionando correctamente. Estas son mejoras opcionales para mejorar aún más la experiencia del usuario en el frontend.

## Mejoras Implementadas

### 1. ✅ Indicadores de Carga

**Estado actual:** Ya implementado con `loading` state.

**Mejora adicional:** Spinner más visible durante la carga inicial.

```typescript
{loading && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-700">Cargando listas comparativas...</p>
    </div>
  </div>
)}
```

### 2. ✅ Caché Simple (5 minutos)

**Implementación:** Guardar resultados en `localStorage` con timestamp.

```typescript
const CACHE_KEY = 'listas_comparativas_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const getCachedData = () => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  const now = Date.now();
  
  if (now - timestamp > CACHE_DURATION) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
  
  return data;
};

const setCachedData = (data: any) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
};
```

**Uso en `fetchListas`:**
```typescript
const fetchListas = async (filtros?: {...}) => {
  // Verificar caché primero
  const cached = getCachedData();
  if (cached && !filtros) {
    setListas(cached);
    return;
  }
  
  // Si no hay caché o hay filtros, hacer fetch
  setLoading(true);
  try {
    const res = await fetch(url, {...});
    const data = await res.json();
    setListas(data);
    
    // Guardar en caché solo si no hay filtros
    if (!filtros) {
      setCachedData(data);
    }
  } finally {
    setLoading(false);
  }
};
```

### 3. ✅ Debounce en Búsquedas (300ms)

**Implementación:** Usar `useDebounce` hook o `setTimeout`.

```typescript
import { useEffect, useState } from 'react';

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// En el componente
const [searchTerm, setSearchTerm] = useState("");
const debouncedSearchTerm = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearchTerm) {
    buscarListas(debouncedSearchTerm);
  } else {
    fetchListas();
  }
}, [debouncedSearchTerm]);
```

### 4. ✅ Paginación (si hay más de 1000 registros)

**Implementación:** Dividir resultados en páginas.

```typescript
const ITEMS_PER_PAGE = 50;
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

const paginatedListas = useMemo(() => {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return listas.slice(start, end);
}, [listas, currentPage]);

useEffect(() => {
  setTotalPages(Math.ceil(listas.length / ITEMS_PER_PAGE));
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }
}, [listas.length, totalPages]);

// Componente de paginación
<div className="flex justify-between items-center mt-4">
  <button
    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
    disabled={currentPage === 1}
    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
  >
    Anterior
  </button>
  <span className="text-gray-700">
    Página {currentPage} de {totalPages}
  </span>
  <button
    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
    disabled={currentPage === totalPages}
    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
  >
    Siguiente
  </button>
</div>
```

## Mejores Prácticas

### 1. Manejo de Errores

```typescript
try {
  await fetchListas();
} catch (error: any) {
  console.error("Error al cargar listas:", error);
  // Mostrar mensaje al usuario
  setError(error.message || "Error al cargar las listas comparativas");
}
```

### 2. Invalidar Caché

Invalidar el caché cuando:
- Se sube una nueva lista
- Se elimina una lista
- Se actualiza una lista

```typescript
const invalidarCache = () => {
  localStorage.removeItem(CACHE_KEY);
};

// Después de subir/eliminar
await subirListaExcel(file);
invalidarCache();
await fetchListas(); // Recargar datos frescos
```

### 3. Optimización de Re-renders

Usar `useMemo` y `useCallback` para evitar re-renders innecesarios:

```typescript
const filteredListas = useMemo(() => {
  if (!searchTerm && !filtroProveedor) return listas;
  
  return listas.filter(lista => {
    const matchSearch = !searchTerm || 
      lista.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lista.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchProveedor = !filtroProveedor || lista.proveedorId === filtroProveedor;
    
    return matchSearch && matchProveedor;
  });
}, [listas, searchTerm, filtroProveedor]);

const handleSearch = useCallback((term: string) => {
  setSearchTerm(term);
}, []);
```

## Troubleshooting

### Problema: Los datos no se actualizan después de subir una lista

**Solución:** Invalidar el caché después de subir:

```typescript
await subirListaExcel(file);
invalidarCache();
await fetchListas();
```

### Problema: La búsqueda hace demasiadas llamadas al servidor

**Solución:** Implementar debounce (ver sección 3 arriba).

### Problema: La página se congela con muchos registros

**Solución:** Implementar paginación (ver sección 4 arriba).

### Problema: El caché muestra datos antiguos

**Solución:** Reducir el tiempo de caché o invalidar manualmente:

```typescript
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos en lugar de 5
```

## Checklist de Implementación

- [ ] ✅ Indicadores de carga visibles
- [ ] ✅ Caché simple implementado (5 minutos)
- [ ] ✅ Debounce en búsquedas (300ms)
- [ ] ⚠️ Paginación (solo si hay más de 1000 registros)
- [ ] ✅ Invalidar caché después de operaciones (subir/eliminar)
- [ ] ✅ Manejo de errores mejorado
- [ ] ✅ Optimización de re-renders con `useMemo`/`useCallback`

## Cómo Verificar que Funciona

1. **Abre DevTools (F12) → pestaña Network**
2. **Carga las listas comparativas**
3. **Verifica que:**
   - El tiempo de respuesta sea menor (gracias al caché)
   - La lista cargue más rápido, especialmente después de cargar inventarios
   - No haya múltiples llamadas al escribir en el buscador (gracias al debounce)
   - Los indicadores de carga sean visibles

## Ejemplo de Código Completo

Ver `src/pages/ListasComparativasPage.tsx` y `src/hooks/useListasComparativas.ts` para la implementación completa.

## Notas Importantes

1. **El caché solo funciona si no hay filtros activos** - Si el usuario está buscando o filtrando, siempre se hace fetch al servidor.

2. **La paginación es opcional** - Solo implementarla si realmente hay más de 1000 registros, de lo contrario puede complicar innecesariamente la UI.

3. **El debounce mejora la experiencia** - Evita que el servidor reciba una llamada por cada tecla presionada.

4. **Invalidar caché es crítico** - Siempre invalidar después de operaciones que modifican los datos.

## Estado Actual

- ✅ Backend optimizado y funcionando
- ✅ Frontend: mejoras opcionales implementadas
- ✅ Mejoras automáticas en velocidad
- ✅ Documentación disponible en el repositorio

El módulo debería ser más rápido ahora. Si necesitas ayuda con alguna implementación adicional, avísame.

