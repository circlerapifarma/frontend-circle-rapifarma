# INSTRUCCIONES BACKEND - VERIFICAR PERMISO orden_compra

## 🚨 PROBLEMA IDENTIFICADO

El frontend está intentando asignar el permiso `orden_compra` a usuarios, pero el backend está rechazando la actualización con el error:

```
Error: No se realizaron cambios en el usuario
Status: 400 Bad Request
```

**Causa posible**: El backend puede no tener `orden_compra` en su lista de permisos válidos, o puede estar usando un nombre diferente (`ordenes_compra`).

---

## 📋 VERIFICACIÓN NECESARIA

### 1. Verificar lista de permisos válidos

El backend debe tener `orden_compra` en su lista de permisos válidos. Según el documento anterior (`INSTRUCCIONES_BACKEND_PERMISOS_RRHH.md`), el backend menciona tener ambos:
- `ordenes_compra`
- `orden_compra`

**ACCIÓN REQUERIDA**: Verificar que `orden_compra` esté definitivamente en la lista de permisos válidos del backend.

### 2. Ubicación del código

Buscar en el código del backend donde se define la lista de permisos válidos. Probablemente esté en:
- Un archivo de constantes o configuración
- Un modelo de validación (Pydantic)
- Una función de validación de permisos
- El endpoint `PATCH /usuarios/{id}`

### 3. Lista completa de permisos que debe tener el backend

```python
PERMISOS_VALIDOS = [
    "ver_inicio",
    "ver_about",
    "agregar_cuadre",
    "verificar_cuadres",
    "ver_cuadres_dia",
    "verificar_gastos",
    "proveedores",
    "acceso_admin",
    "gestionar_usuarios",
    "ver_inventarios",
    "gestionar_cuentas_por_pagar",
    "listas_comparativas",
    "ver_resumen_mensual",
    "ver_ventas_totales",
    "ordenes_compra",  # ⬅️ Verificar que existe
    "orden_compra",    # ⬅️ VERIFICAR QUE ESTE PERMISO EXISTE
    "cajeros",
    "comisiones",
]
```

---

## 🔧 SOLUCIÓN

### Si el permiso NO existe en el backend:

Agregar `orden_compra` a la lista de permisos válidos:

```python
PERMISOS_VALIDOS = [
    # ... otros permisos ...
    "ordenes_compra",
    "orden_compra",  # ⬅️ AGREGAR ESTE SI NO EXISTE
    "cajeros",
    "comisiones",
]
```

### Si el backend usa `ordenes_compra` en lugar de `orden_compra`:

**OPCIÓN 1**: Agregar ambos permisos al backend (recomendado)
```python
PERMISOS_VALIDOS = [
    # ... otros permisos ...
    "ordenes_compra",  # Permiso original
    "orden_compra",    # Permiso del frontend (agregar)
    # ... otros permisos ...
]
```

**OPCIÓN 2**: Cambiar el frontend para usar `ordenes_compra` (no recomendado, requiere cambios en múltiples archivos)

---

## 🔍 CÓMO ENCONTRAR EL CÓDIGO

1. Buscar el mensaje de error: `"No se realizaron cambios en el usuario"` o `"Permisos inválidos"`
2. Buscar la lista de permisos: `PERMISOS_VALIDOS`, `VALID_PERMISSIONS`, `allowed_permissions`
3. Buscar en el endpoint de actualización: `PATCH /usuarios/{id}`
4. Buscar validación de permisos en el modelo Pydantic o función de validación

---

## ✅ VERIFICACIÓN

Después de agregar/verificar el permiso, verificar que:

1. El endpoint `PATCH /usuarios/{id}` acepta `orden_compra` en el array de permisos
2. No se genera el error `"No se realizaron cambios en el usuario"` cuando se intenta asignar `orden_compra`
3. Los usuarios pueden tener el permiso `orden_compra` asignado correctamente
4. El permiso se guarda correctamente en la base de datos

---

## 📝 NOTA IMPORTANTE

El frontend está usando **`orden_compra`** (singular) en:
- `src/pages/UsuariosAdminPage.tsx` - array `PERMISOS`
- `src/pages/auth/RegistroUsuario.tsx` - array `PERMISOS_DISPONIBLES`
- `src/components/Navbar.tsx` - permiso requerido para el enlace
- `src/routers/Routers.tsx` - permiso requerido para la ruta

**El backend DEBE tener `orden_compra` en su lista de permisos válidos para que funcione correctamente.**

---

**Fecha**: 2025-12-07
**Prioridad**: 🔴 ALTA
**Estado**: ⚠️ PENDIENTE DE VERIFICACIÓN/IMPLEMENTACIÓN


