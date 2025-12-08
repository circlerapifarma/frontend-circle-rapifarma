# INSTRUCCIONES BACKEND - AGREGAR PERMISOS DE RRHH

## 🚨 PROBLEMA IDENTIFICADO

El backend está rechazando los permisos `cajeros` y `comisiones` al intentar actualizar usuarios:

```
Error: Permisos inválidos: cajeros, comisiones. 
Permisos disponibles: ver_inicio, ver_about, agregar_cuadre, verificar_cuadres, ver_cuadres_dia, verificar_gastos, proveedores, acceso_admin, gestionar_usuarios, ver_inventarios, gestionar_cuentas_por_pagar, listas_comparativas, ver_resumen_mensual, ver_ventas_totales, ordenes_compra, orden_compra
```

**Causa**: El backend tiene una lista de permisos válidos y estos dos permisos no están incluidos.

---

## 📋 PERMISOS FALTANTES

Los siguientes permisos deben agregarse a la lista de permisos válidos del backend:

1. **`cajeros`** - Para acceder al módulo de Vendedores (`/cajeros`)
2. **`comisiones`** - Para acceder a Comisiones Por Turno y Comisiones Generales (`/comisiones`, `/comisionesgenerales`)

---

## 🔧 SOLUCIÓN

### Ubicación del código

Buscar en el código del backend donde se define la lista de permisos válidos. Probablemente esté en:
- Un archivo de constantes o configuración
- Un modelo de validación (Pydantic)
- Una función de validación de permisos

### Ejemplo de implementación

```python
# Lista de permisos válidos (agregar cajeros y comisiones)
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
    "ordenes_compra",
    "orden_compra",
    "cajeros",  # ⬅️ AGREGAR ESTE
    "comisiones",  # ⬅️ AGREGAR ESTE
]
```

### Función de validación

Si hay una función que valida permisos, asegurarse de que incluya estos dos:

```python
def validar_permisos(permisos: List[str]) -> bool:
    """
    Valida que todos los permisos estén en la lista de permisos válidos.
    """
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
        "ordenes_compra",
        "orden_compra",
        "cajeros",  # ⬅️ AGREGAR
        "comisiones",  # ⬅️ AGREGAR
    ]
    
    for permiso in permisos:
        if permiso not in PERMISOS_VALIDOS:
            return False
    return True
```

### Modelo Pydantic (si se usa)

```python
from pydantic import BaseModel, validator
from typing import List

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
    "ordenes_compra",
    "orden_compra",
    "cajeros",  # ⬅️ AGREGAR
    "comisiones",  # ⬅️ AGREGAR
]

class UsuarioUpdate(BaseModel):
    permisos: List[str]
    
    @validator('permisos')
    def validar_permisos(cls, v):
        for permiso in v:
            if permiso not in PERMISOS_VALIDOS:
                raise ValueError(f"Permiso inválido: {permiso}. Permisos disponibles: {', '.join(PERMISOS_VALIDOS)}")
        return v
```

---

## 🔍 CÓMO ENCONTRAR EL CÓDIGO

1. Buscar el mensaje de error: `"Permisos inválidos"` o `"Permisos disponibles"`
2. Buscar la lista de permisos: `PERMISOS_VALIDOS`, `VALID_PERMISSIONS`, `allowed_permissions`
3. Buscar en el endpoint de actualización de usuarios: `PATCH /usuarios/{id}`

---

## ✅ VERIFICACIÓN

Después de agregar los permisos, verificar que:

1. El endpoint `PATCH /usuarios/{id}` acepta `cajeros` y `comisiones` en el array de permisos
2. No se genera el error `"Permisos inválidos: cajeros, comisiones"`
3. Los usuarios pueden tener estos permisos asignados correctamente

---

## 📝 NOTA

El frontend ya tiene estos permisos en:
- `src/pages/UsuariosAdminPage.tsx` - array `PERMISOS`
- `src/pages/auth/RegistroUsuario.tsx` - array `PERMISOS_DISPONIBLES`

Solo falta que el backend los reconozca como válidos.

---

**Fecha**: 2025-12-07
**Prioridad**: 🟡 MEDIA
**Estado**: ⚠️ PENDIENTE DE IMPLEMENTACIÓN

