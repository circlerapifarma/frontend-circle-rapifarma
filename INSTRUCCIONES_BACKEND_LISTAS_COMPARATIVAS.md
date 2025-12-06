# Instrucciones para Implementar el Backend de Listas Comparativas

Este documento contiene las instrucciones detalladas para implementar el módulo de Listas Comparativas en el backend. Este módulo permite comparar precios de proveedores con descuentos aplicados, costos propios y existencias por farmacia.

## ⚡ OPTIMIZACIÓN CRÍTICA: Carga Rápida

**IMPORTANTE**: La carga del Excel debe ser RÁPIDA. Para lograr esto:

1. **NO obtener el inventario durante la carga del Excel** - El inventario se obtiene SOLO cuando se consultan las listas (GET), no durante la carga (POST)
2. **Usar bulk operations** - Insertar/actualizar en lotes, no uno por uno
3. **Minimizar consultas a la BD** - Obtener códigos existentes en una sola consulta
4. **Procesar en memoria primero** - Preparar todos los datos antes de escribir a la BD

La carga debe responder en menos de 5 segundos incluso con miles de productos.

## 📋 Estructura de Datos

### Modelo de Lista de Precios de Proveedor

El modelo debe tener los siguientes campos:

```python
{
    "_id": ObjectId,  # ID único generado por MongoDB
    "proveedorId": ObjectId,  # Referencia al proveedor (requerido)
    "codigo": str,  # Código del producto (requerido)
    "descripcion": str,  # Descripción del producto (requerido)
    "laboratorio": str,  # Laboratorio del producto (opcional)
    "precio": float,  # Precio del proveedor sin descuento (requerido, >= 0)
    "descuento": float,  # Porcentaje de descuento (requerido, 0-100)
    "precioNeto": float,  # Precio con descuento aplicado (calculado automáticamente)
    "fechaVencimiento": datetime | null,  # Fecha de vencimiento del producto (opcional)
    "existencia": int,  # Existencia del producto en el proveedor (requerido, >= 0)
    "fechaCreacion": datetime,  # Fecha de creación de la lista (requerido)
    "fechaActualizacion": datetime,  # Fecha de última actualización (requerido)
    "usuarioCorreo": str,  # Correo del usuario que subió la lista (requerido)
}
```

**Nota importante**: El precio neto se calcula automáticamente aplicando PRIMERO el descuento del Excel y LUEGO el descuento comercial del proveedor:
```
precioConDescuentoExcel = precio * (1 - descuento / 100)
precioNeto = precioConDescuentoExcel * (1 - descuentosComerciales / 100)
```

O en una sola fórmula:
```
precioNeto = precio * (1 - descuento / 100) * (1 - descuentosComerciales / 100)
```

Donde:
- `precio`: Precio del proveedor sin descuentos
- `descuento`: Porcentaje de descuento del Excel (0-100)
- `descuentosComerciales`: Porcentaje de descuento comercial del proveedor (0-100)

### Índices Recomendados

```javascript
// Índice compuesto para búsquedas rápidas
db.listas_precios_proveedores.createIndex({ "codigo": 1, "proveedorId": 1 })
db.listas_precios_proveedores.createIndex({ "descripcion": "text", "laboratorio": "text" })
db.listas_precios_proveedores.createIndex({ "proveedorId": 1 })
db.listas_precios_proveedores.createIndex({ "codigo": 1 })
db.listas_precios_proveedores.createIndex({ "fechaVencimiento": 1 })
```

## 🔌 Endpoints Requeridos

### 1. POST `/listas-comparativas/excel`

**Descripción:** Subir una lista de precios de un proveedor desde un archivo Excel.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Request Body (multipart/form-data):**
- `archivo`: Archivo Excel (.xlsx, .xls) - requerido
- `proveedorId`: ID del proveedor (string) - requerido
- `usuarioCorreo`: Correo del usuario (string) - requerido

**Formato del Excel esperado:**
El archivo Excel debe tener las siguientes columnas (en cualquier orden, pero deben estar presentes):
- `CODIGO` o `codigo` o `código`: Código del producto (requerido)
- `DESCRIPCION` o `descripcion` o `descripción`: Descripción del producto (requerido)
- `LABORATORIO` o `laboratorio`: Laboratorio del producto (opcional)
- `PRECIO` o `precio`: Precio del proveedor sin descuento (requerido, >= 0)
- `DESCUENTO` o `descuento`: Porcentaje de descuento (requerido, 0-100)
- `FECHA DE VENCIMIENTO` o `fecha de vencimiento` o `fechaVencimiento`: Fecha de vencimiento del producto (opcional, formato: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
- `EXISTENCIA` o `existencia`: Cantidad disponible en el proveedor (requerido, >= 0)

**Ejemplo de Excel:**
```
CODIGO | DESCRIPCION | LABORATORIO | PRECIO | DESCUENTO | FECHA DE VENCIMIENTO | EXISTENCIA
PROD001 | Paracetamol 500mg | Lab XYZ | 2.50 | 5.5 | 31/12/2024 | 100
PROD002 | Ibuprofeno 400mg | Lab ABC | 3.00 | 10.0 | 15/01/2025 | 75
```

**Validaciones:**
- El proveedor debe existir en la base de datos
- El usuario debe existir en la base de datos
- El archivo debe ser un Excel válido
- Debe tener al menos una fila de datos (después del encabezado)
- Los campos `codigo`, `descripcion`, `precio`, `descuento` y `existencia` son requeridos
- El `descuento` debe estar entre 0 y 100
- El `precio` y `existencia` deben ser números positivos o cero
- La `fechaVencimiento` debe ser una fecha válida si se proporciona

**Cálculo del Precio Neto:**
El precio neto se calcula automáticamente para cada item aplicando PRIMERO el descuento del Excel y LUEGO el descuento comercial del proveedor:
```
precioConDescuentoExcel = precio * (1 - descuento / 100)
precioNeto = precioConDescuentoExcel * (1 - descuentosComerciales / 100)
```

O en una sola fórmula:
```
precioNeto = precio * (1 - descuento / 100) * (1 - descuentosComerciales / 100)
```

**IMPORTANTE**: El descuento comercial del proveedor se obtiene de la colección `proveedores` usando el campo `descuentosComerciales`.

**Respuesta exitosa (200):**
```json
{
    "message": "Lista de precios cargada correctamente",
    "itemsProcessed": 150,
    "proveedorId": "507f1f77bcf86cd799439011",
    "fecha": "2024-01-15T10:30:00Z"
}
```

**Errores:**
- `400 Bad Request`: Archivo inválido, datos faltantes o formato incorrecto
- `404 Not Found`: Proveedor o usuario no encontrado
- `401 Unauthorized`: Token no válido o ausente
- `403 Forbidden`: Usuario no tiene permiso `listas_comparativas`
- `500 Internal Server Error`: Error del servidor

**Ejemplo de error (400):**
```json
{
    "detail": "El archivo Excel debe tener las columnas: CODIGO, DESCRIPCION, PRECIO, DESCUENTO, EXISTENCIA"
}
```

---

### 2. GET `/listas-comparativas`

**Descripción:** Obtener todas las listas de precios de todos los proveedores con información completa para comparación.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Query Parameters (todos opcionales):**
- `codigo`: Buscar por código de producto
- `nombre`: Buscar por nombre/descripción del producto
- `laboratorio`: Buscar por laboratorio
- `proveedorId`: Filtrar por proveedor específico

**Respuesta exitosa (200):**
```json
[
    {
        "_id": "507f1f77bcf86cd799439011",
        "proveedorId": "507f1f77bcf86cd799439012",
        "proveedor": {
            "_id": "507f1f77bcf86cd799439012",
            "nombreJuridico": "Farmacia ABC, C.A."
        },
        "codigo": "PROD001",
        "descripcion": "Paracetamol 500mg",
        "laboratorio": "Laboratorio XYZ",
        "precio": 2.50,
        "descuento": 5.5,
        "precioNeto": 2.36,
        "fechaVencimiento": "2024-12-31T00:00:00Z",
        "existencia": 100,
        "miCosto": 2.20,
        "existencias": [
            {
                "farmacia": "01",
                "farmaciaNombre": "Santa Elena",
                "existencia": 50
            },
            {
                "farmacia": "02",
                "farmaciaNombre": "Sur America",
                "existencia": 75
            }
        ],
        "fechaCreacion": "2024-01-15T10:30:00Z",
        "fechaActualizacion": "2024-01-15T10:30:00Z"
    }
]
```

**Lógica de cálculo:**
- `precioNeto`: Se calcula como `precio * (1 - descuento / 100) * (1 - descuentosComerciales / 100)` donde `descuentosComerciales` es el descuento comercial del proveedor
- `miCosto`: Se obtiene del inventario (promedio de costos si hay múltiples farmacias, o el costo de la primera farmacia encontrada)
- `existencias`: Array con existencias por cada farmacia donde existe el producto (obtenido del inventario)

**Errores:**
- `401 Unauthorized`: Token no válido o ausente
- `403 Forbidden`: Usuario no tiene permiso `listas_comparativas`
- `500 Internal Server Error`: Error del servidor

---

### 3. GET `/listas-comparativas/buscar`

**Descripción:** Buscar productos en las listas comparativas con filtros avanzados.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Query Parameters (todos opcionales):**
- `q`: Término de búsqueda general (busca en código, descripción y laboratorio)
- `codigo`: Buscar por código exacto o parcial
- `nombre`: Buscar por nombre/descripción
- `laboratorio`: Buscar por laboratorio
- `proveedorId`: Filtrar por proveedor específico

**Respuesta exitosa (200):**
```json
[
    {
        "_id": "507f1f77bcf86cd799439011",
        "proveedorId": "507f1f77bcf86cd799439012",
        "proveedor": {
            "_id": "507f1f77bcf86cd799439012",
            "nombreJuridico": "Farmacia ABC, C.A."
        },
        "codigo": "PROD001",
        "descripcion": "Paracetamol 500mg",
        "laboratorio": "Laboratorio XYZ",
        "precio": 2.50,
        "descuento": 5.5,
        "precioNeto": 2.36,
        "fechaVencimiento": "2024-12-31T00:00:00Z",
        "existencia": 100,
        "miCosto": 2.20,
        "existencias": [...],
        "fechaCreacion": "2024-01-15T10:30:00Z",
        "fechaActualizacion": "2024-01-15T10:30:00Z"
    }
]
```

**Notas:**
- Si se proporciona `q`, busca en código, descripción y laboratorio
- Los otros parámetros son filtros adicionales que se aplican con AND
- La búsqueda debe ser case-insensitive

---

### 4. GET `/listas-comparativas/proveedor/{proveedorId}`

**Descripción:** Obtener todas las listas de precios de un proveedor específico.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Parámetros de URL:**
- `proveedorId`: ID del proveedor (ObjectId de MongoDB)

**Respuesta exitosa (200):**
```json
[
    {
        "_id": "507f1f77bcf86cd799439011",
        "proveedorId": "507f1f77bcf86cd799439012",
        "proveedor": {
            "_id": "507f1f77bcf86cd799439012",
            "nombreJuridico": "Farmacia ABC, C.A."
        },
        "codigo": "PROD001",
        "descripcion": "Paracetamol 500mg",
        "laboratorio": "Laboratorio XYZ",
        "precio": 2.50,
        "descuento": 5.5,
        "precioNeto": 2.36,
        "fechaVencimiento": "2024-12-31T00:00:00Z",
        "existencia": 100,
        "miCosto": 2.20,
        "existencias": [...],
        "fechaCreacion": "2024-01-15T10:30:00Z",
        "fechaActualizacion": "2024-01-15T10:30:00Z"
    }
]
```

**Errores:**
- `404 Not Found`: Proveedor no encontrado
- `401 Unauthorized`: Token no válido o ausente
- `403 Forbidden`: Usuario no tiene permiso `listas_comparativas`
- `500 Internal Server Error`: Error del servidor

---

### 5. DELETE `/listas-comparativas/{id}`

**Descripción:** Eliminar un item de lista de precios.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Parámetros de URL:**
- `id`: ID del item de lista de precios (ObjectId de MongoDB)

**Respuesta exitosa (200):**
```json
{
    "message": "Item de lista de precios eliminado exitosamente",
    "id": "507f1f77bcf86cd799439011"
}
```

**Errores:**
- `404 Not Found`: Item no encontrado
- `401 Unauthorized`: Token no válido o ausente
- `403 Forbidden`: Usuario no tiene permiso `listas_comparativas`
- `500 Internal Server Error`: Error del servidor

---

### 6. DELETE `/listas-comparativas/proveedor/{proveedorId}`

**Descripción:** Eliminar todas las listas de precios de un proveedor específico.

**Autenticación:** Requerida (Bearer Token)

**Permiso requerido:** `listas_comparativas`

**Parámetros de URL:**
- `proveedorId`: ID del proveedor (ObjectId de MongoDB)

**Respuesta exitosa (200):**
```json
{
    "message": "Listas de precios eliminadas exitosamente",
    "itemsEliminados": 150,
    "proveedorId": "507f1f77bcf86cd799439012"
}
```

**Errores:**
- `404 Not Found`: Proveedor no encontrado
- `401 Unauthorized`: Token no válido o ausente
- `403 Forbidden`: Usuario no tiene permiso `listas_comparativas`
- `500 Internal Server Error`: Error del servidor

---

## 🔒 Permisos

### Agregar el nuevo permiso al sistema

Debes agregar `"listas_comparativas"` a la lista de permisos válidos en tu sistema:

```python
PERMISOS_VALIDOS = [
    "ver_inicio", "ver_about", "agregar_cuadre", "ver_resumen_mensual",
    "verificar_cuadres", "ver_cuadres_dia", "ver_resumen_dia",
    "acceso_admin", "eliminar_cuadres", "ver_ventas_totales",
    "verificar_gastos", "comisiones", "cajeros", "metas",
    "modificar_cuadre", "proveedores", "usuarios",
    "listas_comparativas"  # Nuevo permiso
]
```

Todos los endpoints requieren autenticación mediante Bearer Token y el permiso `listas_comparativas`.

---

## 💾 Base de Datos

### MongoDB - Esquema de Colección

**Nombre de la colección:** `listas_precios_proveedores`

### Ejemplo de Documento en MongoDB

```json
{
    "_id": ObjectId("507f1f77bcf86cd799439011"),
    "proveedorId": ObjectId("507f1f77bcf86cd799439012"),
    "codigo": "PROD001",
    "descripcion": "Paracetamol 500mg",
    "laboratorio": "Laboratorio XYZ",
    "precio": 2.50,
    "descuento": 5.5,
    "precioNeto": 2.3625,
    "fechaVencimiento": ISODate("2024-12-31T00:00:00Z"),
    "existencia": 100,
    "fechaCreacion": ISODate("2024-01-15T10:30:00Z"),
    "fechaActualizacion": ISODate("2024-01-15T10:30:00Z"),
    "usuarioCorreo": "usuario@ejemplo.com"
}
```

### Relaciones con otras colecciones

1. **Proveedores**: `proveedorId` referencia a `proveedores._id`
2. **Inventarios**: Se busca por `codigo` en la colección `inventarios` para obtener costos y existencias
3. **Farmacias**: Se usa para obtener nombres de farmacias desde los inventarios

---

## 📝 Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import openpyxl  # o xlrd para .xls
import io
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user  # Tu función de autenticación

router = APIRouter(prefix="/listas-comparativas", tags=["listas-comparativas"])

# Modelos Pydantic
class ListaPrecioItem(BaseModel):
    codigo: str
    descripcion: str
    laboratorio: str = ""
    precio: float
    descuento: float
    precioNeto: float
    fechaVencimiento: Optional[datetime] = None
    existencia: int

class ListaPrecioResponse(BaseModel):
    _id: str
    proveedorId: str
    proveedor: dict
    codigo: str
    descripcion: str
    laboratorio: str
    precio: float
    descuento: float
    precioNeto: float
    fechaVencimiento: Optional[datetime]
    existencia: int
    miCosto: Optional[float]
    existencias: List[dict]
    fechaCreacion: datetime
    fechaActualizacion: datetime

# Helper para parsear fecha
def parsear_fecha(fecha_str: str) -> Optional[datetime]:
    """Parsea diferentes formatos de fecha"""
    if not fecha_str or fecha_str == "":
        return None
    
    fecha_str = str(fecha_str).strip()
    
    # Intentar diferentes formatos
    formatos = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%d/%m/%y",
        "%d-%m-%y",
    ]
    
    for formato in formatos:
        try:
            return datetime.strptime(fecha_str, formato)
        except ValueError:
            continue
    
    # Si es un número (días desde 1900 en Excel)
    try:
        dias = float(fecha_str)
        fecha_base = datetime(1900, 1, 1)
        return fecha_base + timedelta(days=int(dias) - 2)
    except (ValueError, OverflowError):
        pass
    
    return None

# Helper para calcular precio neto
def calcular_precio_neto(precio: float, descuento: float, descuento_comercial: float = 0) -> float:
    """
    Calcula el precio neto aplicando primero el descuento del Excel y luego el descuento comercial del proveedor
    """
    precio_con_descuento_excel = precio * (1 - descuento / 100)
    precio_neto = precio_con_descuento_excel * (1 - descuento_comercial / 100)
    return precio_neto

# Helper para obtener costos y existencias del inventario
async def obtener_info_inventario(db, codigo: str):
    """Obtiene el costo y existencias por farmacia de un producto"""
    inventarios = await db.inventarios.find({"codigo": codigo}).to_list(length=None)
    
    if not inventarios:
        return None, []
    
    # Calcular costo promedio
    costos = [inv.get("costo", 0) for inv in inventarios if inv.get("costo", 0) > 0]
    costo_promedio = sum(costos) / len(costos) if costos else None
    
    # Obtener existencias por farmacia
    existencias = []
    farmacias_dict = {}
    
    # Obtener nombres de farmacias
    async for farmacia in db.farmacias.find():
        farmacias_dict[str(farmacia.get("_id", ""))] = farmacia.get("nombre", "")
    
    for inv in inventarios:
        farmacia_id = inv.get("farmacia", "")
        existencia = inv.get("existencia", 0)
        if existencia > 0:
            existencias.append({
                "farmacia": farmacia_id,
                "farmaciaNombre": farmacias_dict.get(farmacia_id, farmacia_id),
                "existencia": existencia
            })
    
    return costo_promedio, existencias

# Helper para convertir ObjectId a string
def lista_precio_helper(lista_precio, proveedor=None, costo=None, existencias=None) -> dict:
    return {
        "_id": str(lista_precio["_id"]),
        "proveedorId": str(lista_precio["proveedorId"]),
        "proveedor": {
            "_id": str(proveedor["_id"]) if proveedor else str(lista_precio["proveedorId"]),
            "nombreJuridico": proveedor.get("nombreJuridico", "") if proveedor else "",
        } if proveedor else None,
        "codigo": lista_precio["codigo"],
        "descripcion": lista_precio["descripcion"],
        "laboratorio": lista_precio.get("laboratorio", ""),
        "precio": lista_precio["precio"],
        "descuento": lista_precio["descuento"],
        "precioNeto": round(lista_precio.get("precioNeto", calcular_precio_neto(
            lista_precio["precio"], 
            lista_precio["descuento"],
            proveedor.get("descuentosComerciales", 0) if proveedor else 0
        )), 2),
        "fechaVencimiento": lista_precio.get("fechaVencimiento").isoformat() if lista_precio.get("fechaVencimiento") else None,
        "existencia": lista_precio.get("existencia", 0),
        "miCosto": round(costo, 2) if costo is not None else None,
        "existencias": existencias or [],
        "fechaCreacion": lista_precio.get("fechaCreacion", datetime.utcnow()).isoformat() if isinstance(lista_precio.get("fechaCreacion"), datetime) else lista_precio.get("fechaCreacion"),
        "fechaActualizacion": lista_precio.get("fechaActualizacion", datetime.utcnow()).isoformat() if isinstance(lista_precio.get("fechaActualizacion"), datetime) else lista_precio.get("fechaActualizacion"),
    }

@router.post("/excel")
async def subir_lista_excel(
    archivo: UploadFile = File(...),
    proveedorId: str = Form(...),
    usuarioCorreo: EmailStr = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Subir lista de precios desde Excel"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    # Validar proveedor
    proveedor = await db.proveedores.find_one({"_id": ObjectId(proveedorId)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Validar usuario
    usuario = await db.usuarios.find_one({"correo": usuarioCorreo})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Leer archivo Excel
    try:
        # Leer el contenido del archivo
        contents = await archivo.read()
        
        # Validar que el archivo no esté vacío
        if not contents or len(contents) == 0:
            raise HTTPException(status_code=400, detail="El archivo Excel está vacío")
        
        # Cargar el workbook desde bytes
        workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = workbook.active
        
        # Validar que la hoja tenga datos
        if sheet.max_row < 2:
            raise HTTPException(status_code=400, detail="El archivo Excel debe tener al menos una fila de datos (después del encabezado)")
        
        # Obtener encabezados (primera fila)
        headers = []
        for cell in sheet[1]:
            if cell.value:
                headers.append(str(cell.value).lower().strip())
            else:
                headers.append("")
        
        # Buscar índices de columnas
        codigo_idx = next((i for i, h in enumerate(headers) if "codigo" in h or "código" in h), -1)
        descripcion_idx = next((i for i, h in enumerate(headers) if "descripcion" in h or "descripción" in h), -1)
        laboratorio_idx = next((i for i, h in enumerate(headers) if "laboratorio" in h), -1)
        precio_idx = next((i for i, h in enumerate(headers) if "precio" in h), -1)
        descuento_idx = next((i for i, h in enumerate(headers) if "descuento" in h), -1)
        fecha_venc_idx = next((i for i, h in enumerate(headers) if "vencimiento" in h or "venc" in h), -1)
        existencia_idx = next((i for i, h in enumerate(headers) if "existencia" in h), -1)
        
        if codigo_idx == -1 or descripcion_idx == -1 or precio_idx == -1 or descuento_idx == -1 or existencia_idx == -1:
            raise HTTPException(
                status_code=400,
                detail="El archivo Excel debe tener las columnas: CODIGO, DESCRIPCION, PRECIO, DESCUENTO, EXISTENCIA"
            )
        
        # ⚠️ IMPORTANTE: NO obtener inventario durante la carga - esto se hace después en el GET
        # El inventario se obtiene solo cuando se consultan las listas, no durante la carga
        
        # Procesar filas en lotes para mayor velocidad (bulk operations)
        items_guardados = 0
        errores = []
        items_to_insert = []
        items_to_update = []
        
        # Primero, obtener todos los códigos existentes para este proveedor en una sola consulta
        existing_codes = set()
        async for item in db.listas_precios_proveedores.find(
            {"proveedorId": ObjectId(proveedorId)},
            {"codigo": 1}
        ):
            existing_codes.add(item.get("codigo", ""))
        
        # Obtener descuento comercial del proveedor una sola vez
        descuento_comercial = proveedor.get("descuentosComerciales", 0) or 0
        fecha_actual = datetime.utcnow()
        
        # Procesar todas las filas primero
        for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=False), start=2):
            try:
                codigo = str(row[codigo_idx].value or "").strip() if codigo_idx < len(row) else ""
                descripcion = str(row[descripcion_idx].value or "").strip() if descripcion_idx < len(row) else ""
                laboratorio = str(row[laboratorio_idx].value or "").strip() if laboratorio_idx != -1 and laboratorio_idx < len(row) else ""
                precio = row[precio_idx].value if precio_idx < len(row) else None
                descuento = row[descuento_idx].value if descuento_idx < len(row) else None
                fecha_venc = row[fecha_venc_idx].value if fecha_venc_idx != -1 and fecha_venc_idx < len(row) else None
                existencia = row[existencia_idx].value if existencia_idx < len(row) else None
                
                # Validar campos requeridos
                if not codigo or not descripcion:
                    continue
                
                # Convertir y validar valores numéricos
                try:
                    precio_float = float(precio) if precio is not None else 0.0
                    descuento_float = float(descuento) if descuento is not None else 0.0
                    existencia_int = int(float(existencia)) if existencia is not None else 0
                except (ValueError, TypeError) as e:
                    errores.append(f"Fila {row_num}: Error al convertir valores numéricos - {str(e)}")
                    continue
                
                # Validar rangos
                if precio_float < 0:
                    errores.append(f"Fila {row_num}: El precio no puede ser negativo")
                    continue
                if descuento_float < 0 or descuento_float > 100:
                    errores.append(f"Fila {row_num}: El descuento debe estar entre 0 y 100")
                    continue
                if existencia_int < 0:
                    errores.append(f"Fila {row_num}: La existencia no puede ser negativa")
                    continue
                
                # Calcular precio neto (aplica descuento del Excel y luego descuento comercial del proveedor)
                precio_neto = calcular_precio_neto(precio_float, descuento_float, descuento_comercial)
                
                # Parsear fecha de vencimiento
                fecha_venc_parsed = None
                if fecha_venc:
                    fecha_venc_parsed = parsear_fecha(str(fecha_venc))
                
                item_data = {
                    "proveedorId": ObjectId(proveedorId),
                    "codigo": codigo,
                    "descripcion": descripcion,
                    "laboratorio": laboratorio,
                    "precio": precio_float,
                    "descuento": descuento_float,
                    "precioNeto": round(precio_neto, 2),
                    "fechaVencimiento": fecha_venc_parsed,
                    "existencia": existencia_int,
                    "fechaActualizacion": fecha_actual,
                    "usuarioCorreo": usuarioCorreo
                }
                
                # Separar en insertar o actualizar
                if codigo in existing_codes:
                    items_to_update.append({
                        "filter": {"codigo": codigo, "proveedorId": ObjectId(proveedorId)},
                        "update": {"$set": item_data}
                    })
                else:
                    item_data["fechaCreacion"] = fecha_actual
                    items_to_insert.append(item_data)
                
            except Exception as e:
                errores.append(f"Fila {row_num}: {str(e)}")
                continue
        
        # Ejecutar bulk insert (mucho más rápido que insertar uno por uno)
        if items_to_insert:
            await db.listas_precios_proveedores.insert_many(items_to_insert, ordered=False)
            items_guardados += len(items_to_insert)
        
        # Ejecutar bulk update (mucho más rápido que actualizar uno por uno)
        if items_to_update:
            # Usar bulk_write para updates
            from pymongo import UpdateOne
            bulk_ops = [UpdateOne(item["filter"], item["update"]) for item in items_to_update]
            if bulk_ops:
                result = await db.listas_precios_proveedores.bulk_write(bulk_ops, ordered=False)
                items_guardados += result.modified_count
        
        # Cerrar el workbook para liberar memoria
        workbook.close()
        
        # Preparar respuesta
        response = {
            "message": "Lista de precios cargada correctamente",
            "itemsProcessed": items_guardados,
            "proveedorId": proveedorId,
            "fecha": datetime.utcnow().isoformat()
        }
        
        # Agregar errores si los hay (solo como información, no bloquea la operación)
        if errores:
            response["warnings"] = errores[:10]  # Limitar a 10 errores para no hacer la respuesta muy grande
        
        return response
    
    except HTTPException:
        # Re-lanzar HTTPException tal cual
        raise
    except Exception as e:
        # Capturar cualquier otro error y devolver un mensaje seguro
        error_message = str(e)
        # Asegurarse de que el mensaje no contenga objetos bytes
        if isinstance(e, (TypeError, ValueError)):
            error_message = f"Error al procesar archivo Excel: {error_message}"
        else:
            error_message = "Error al procesar archivo Excel. Verifique que el archivo sea válido."
        raise HTTPException(status_code=400, detail=error_message)

@router.get("", response_model=List[dict])
async def obtener_listas_comparativas(
    codigo: Optional[str] = None,
    nombre: Optional[str] = None,
    laboratorio: Optional[str] = None,
    proveedorId: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener todas las listas comparativas"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    # Construir filtro
    filtro = {}
    if codigo:
        filtro["codigo"] = {"$regex": codigo, "$options": "i"}
    if nombre:
        filtro["descripcion"] = {"$regex": nombre, "$options": "i"}
    if laboratorio:
        filtro["laboratorio"] = {"$regex": laboratorio, "$options": "i"}
    if proveedorId:
        filtro["proveedorId"] = ObjectId(proveedorId)
    
    # Obtener listas
    listas = []
    async for lista_precio in db.listas_precios_proveedores.find(filtro):
        # Obtener proveedor
        proveedor = await db.proveedores.find_one({"_id": lista_precio["proveedorId"]})
        
        # Obtener información del inventario
        costo, existencias = await obtener_info_inventario(db, lista_precio["codigo"])
        
        listas.append(lista_precio_helper(lista_precio, proveedor, costo, existencias))
    
    return listas

# ... (resto de endpoints similares a los anteriores)
```

---

## ✅ Checklist de Implementación

- [ ] Agregar permiso `"listas_comparativas"` a la lista de permisos válidos
- [ ] Crear colección `listas_precios_proveedores` en MongoDB
- [ ] Crear índices recomendados en la colección
- [ ] Implementar endpoint POST `/listas-comparativas/excel` con procesamiento de Excel
- [ ] Implementar función para parsear fechas en diferentes formatos
- [ ] Implementar cálculo de precio neto (precio * (1 - descuento / 100))
- [ ] Implementar endpoint GET `/listas-comparativas` con filtros
- [ ] Implementar endpoint GET `/listas-comparativas/buscar` con búsqueda avanzada
- [ ] Implementar endpoint GET `/listas-comparativas/proveedor/{proveedorId}`
- [ ] Implementar endpoint DELETE `/listas-comparativas/{id}`
- [ ] Implementar endpoint DELETE `/listas-comparativas/proveedor/{proveedorId}`
- [ ] Implementar integración con inventarios para obtener costos y existencias
- [ ] Agregar autenticación a todos los endpoints
- [ ] Agregar validación de permisos a todos los endpoints
- [ ] Agregar manejo de errores apropiado
- [ ] Probar todos los endpoints con Postman o similar
- [ ] Verificar que el cálculo de descuentos sea correcto
- [ ] Verificar que la búsqueda funcione correctamente

---

## ⚠️ Solución de Errores Comunes

### Error: "Object of type bytes is not JSON serializable"

Este error ocurre cuando se intenta serializar objetos `bytes` a JSON. Para solucionarlo:

1. **Asegúrate de importar `io`**: 
   ```python
   import io
   ```

2. **Usa `data_only=True` al cargar el workbook**:
   ```python
   workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
   ```

3. **Convierte todas las fechas a strings ISO antes de devolver**:
   ```python
   "fechaVencimiento": fecha_venc_parsed.isoformat() if fecha_venc_parsed else None
   ```

4. **Maneja los errores correctamente sin incluir objetos bytes**:
   ```python
   except Exception as e:
       error_message = str(e)  # Convierte a string, no incluye bytes
       raise HTTPException(status_code=400, detail=error_message)
   ```

5. **Cierra el workbook después de usarlo**:
   ```python
   workbook.close()  # Libera memoria y evita problemas de serialización
   ```

## 🔍 Notas Adicionales

1. **Formato de Fecha**: El sistema debe aceptar múltiples formatos de fecha:
   - DD/MM/YYYY
   - DD-MM-YYYY
   - YYYY-MM-DD
   - Números de Excel (días desde 1900)

2. **Cálculo de Precio Neto**: Siempre se calcula como `precio * (1 - descuento / 100)`

3. **Validación de Descuento**: El descuento debe estar entre 0 y 100 (porcentaje)

4. **Existencia**: La existencia en el Excel es la cantidad disponible en el proveedor, diferente de las existencias por farmacia que se obtienen del inventario.

5. **Actualización de listas**: Si se sube una lista de precios para un proveedor que ya tiene listas, se recomienda:
   - Actualizar items existentes (mismo código)
   - Agregar nuevos items
   - Opcionalmente, eliminar items que ya no están en la nueva lista
