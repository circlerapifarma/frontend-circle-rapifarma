# Instrucciones para Implementar el Backend de Listas Comparativas

Este documento contiene las instrucciones detalladas para implementar el módulo de Listas Comparativas en el backend. Este módulo permite comparar precios de proveedores con descuentos comerciales aplicados, costos propios y existencias por farmacia.

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
    "precioProveedor": float,  # Precio del proveedor sin descuento (requerido, >= 0)
    "fechaCreacion": datetime,  # Fecha de creación de la lista (requerido)
    "fechaActualizacion": datetime,  # Fecha de última actualización (requerido)
    "usuarioCorreo": str,  # Correo del usuario que subió la lista (requerido)
}
```

**Nota importante**: El precio con descuento comercial se calcula dinámicamente usando:
```
precioConDescuento = precioProveedor * (1 - descuentosComerciales / 100)
```

### Índices Recomendados

```javascript
// Índice compuesto para búsquedas rápidas
db.listas_precios_proveedores.createIndex({ "codigo": 1, "proveedorId": 1 })
db.listas_precios_proveedores.createIndex({ "descripcion": "text", "laboratorio": "text" })
db.listas_precios_proveedores.createIndex({ "proveedorId": 1 })
db.listas_precios_proveedores.createIndex({ "codigo": 1 })
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
- `codigo` o `código`: Código del producto
- `descripcion` o `descripción`: Descripción del producto
- `laboratorio`: Laboratorio (opcional)
- `precio` o `precioProveedor`: Precio del proveedor

**Validaciones:**
- El proveedor debe existir en la base de datos
- El usuario debe existir en la base de datos
- El archivo debe ser un Excel válido
- Debe tener al menos una fila de datos (después del encabezado)
- Los campos `codigo`, `descripcion` y `precio` son requeridos

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
    "detail": "El archivo Excel debe tener las columnas: codigo, descripcion, precio"
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
            "nombreJuridico": "Farmacia ABC, C.A.",
            "descuentosComerciales": 5.5
        },
        "codigo": "PROD001",
        "descripcion": "Paracetamol 500mg",
        "laboratorio": "Laboratorio XYZ",
        "precioProveedor": 2.50,
        "precioConDescuento": 2.36,
        "miCosto": 2.20,
        "existencias": [
            {
                "farmacia": "01",
                "farmaciaNombre": "Santa Elena",
                "existencia": 100
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
- `precioConDescuento`: Se calcula como `precioProveedor * (1 - descuentosComerciales / 100)`
- `miCosto`: Se obtiene del inventario (promedio de costos si hay múltiples farmacias, o el costo de la primera farmacia encontrada)
- `existencias`: Array con existencias por cada farmacia donde existe el producto

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
            "nombreJuridico": "Farmacia ABC, C.A.",
            "descuentosComerciales": 5.5
        },
        "codigo": "PROD001",
        "descripcion": "Paracetamol 500mg",
        "laboratorio": "Laboratorio XYZ",
        "precioProveedor": 2.50,
        "precioConDescuento": 2.36,
        "miCosto": 2.20,
        "existencias": [
            {
                "farmacia": "01",
                "farmaciaNombre": "Santa Elena",
                "existencia": 100
            }
        ],
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
            "nombreJuridico": "Farmacia ABC, C.A.",
            "descuentosComerciales": 5.5
        },
        "codigo": "PROD001",
        "descripcion": "Paracetamol 500mg",
        "laboratorio": "Laboratorio XYZ",
        "precioProveedor": 2.50,
        "precioConDescuento": 2.36,
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
    "precioProveedor": 2.50,
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
from datetime import datetime
from bson import ObjectId
import openpyxl  # o xlrd para .xls
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user  # Tu función de autenticación

router = APIRouter(prefix="/listas-comparativas", tags=["listas-comparativas"])

# Modelos Pydantic
class ListaPrecioItem(BaseModel):
    codigo: str
    descripcion: str
    laboratorio: str = ""
    precioProveedor: float

class ListaPrecioResponse(BaseModel):
    _id: str
    proveedorId: str
    proveedor: dict
    codigo: str
    descripcion: str
    laboratorio: str
    precioProveedor: float
    precioConDescuento: float
    miCosto: Optional[float]
    existencias: List[dict]
    fechaCreacion: datetime
    fechaActualizacion: datetime

# Helper para calcular precio con descuento
def calcular_precio_con_descuento(precio: float, descuento_comercial: float) -> float:
    return precio * (1 - descuento_comercial / 100)

# Helper para obtener costos y existencias del inventario
async def obtener_info_inventario(db, codigo: str):
    """Obtiene el costo y existencias por farmacia de un producto"""
    inventarios = await db.inventarios.find({"codigo": codigo}).to_list(length=None)
    
    if not inventarios:
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
    
    return None, []

# Helper para convertir ObjectId a string
def lista_precio_helper(lista_precio, proveedor=None, costo=None, existencias=None) -> dict:
    descuento_comercial = proveedor.get("descuentosComerciales", 0) if proveedor else 0
    precio_con_descuento = calcular_precio_con_descuento(
        lista_precio["precioProveedor"], 
        descuento_comercial
    )
    
    return {
        "_id": str(lista_precio["_id"]),
        "proveedorId": str(lista_precio["proveedorId"]),
        "proveedor": {
            "_id": str(proveedor["_id"]) if proveedor else str(lista_precio["proveedorId"]),
            "nombreJuridico": proveedor.get("nombreJuridico", "") if proveedor else "",
            "descuentosComerciales": descuento_comercial
        } if proveedor else None,
        "codigo": lista_precio["codigo"],
        "descripcion": lista_precio["descripcion"],
        "laboratorio": lista_precio.get("laboratorio", ""),
        "precioProveedor": lista_precio["precioProveedor"],
        "precioConDescuento": round(precio_con_descuento, 2),
        "miCosto": round(costo, 2) if costo is not None else None,
        "existencias": existencias or [],
        "fechaCreacion": lista_precio.get("fechaCreacion", datetime.utcnow()),
        "fechaActualizacion": lista_precio.get("fechaActualizacion", datetime.utcnow()),
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
        contents = await archivo.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents))
        sheet = workbook.active
        
        # Obtener encabezados (primera fila)
        headers = [str(cell.value).lower().strip() if cell.value else "" for cell in sheet[1]]
        
        # Buscar índices de columnas
        codigo_idx = next((i for i, h in enumerate(headers) if "codigo" in h or "código" in h), -1)
        descripcion_idx = next((i for i, h in enumerate(headers) if "descripcion" in h or "descripción" in h), -1)
        laboratorio_idx = next((i for i, h in enumerate(headers) if "laboratorio" in h), -1)
        precio_idx = next((i for i, h in enumerate(headers) if "precio" in h), -1)
        
        if codigo_idx == -1 or descripcion_idx == -1 or precio_idx == -1:
            raise HTTPException(
                status_code=400,
                detail="El archivo Excel debe tener las columnas: codigo, descripcion, precio"
            )
        
        # Procesar filas
        items_guardados = 0
        for row in sheet.iter_rows(min_row=2, values_only=False):
            codigo = str(row[codigo_idx].value or "").strip()
            descripcion = str(row[descripcion_idx].value or "").strip()
            laboratorio = str(row[laboratorio_idx].value or "").strip() if laboratorio_idx != -1 else ""
            precio = row[precio_idx].value
            
            if not codigo or not descripcion:
                continue
            
            try:
                precio_float = float(precio) if precio else 0.0
                if precio_float < 0:
                    continue
            except (ValueError, TypeError):
                continue
            
            # Verificar si ya existe (mismo código y proveedor)
            existing = await db.listas_precios_proveedores.find_one({
                "codigo": codigo,
                "proveedorId": ObjectId(proveedorId)
            })
            
            item_data = {
                "proveedorId": ObjectId(proveedorId),
                "codigo": codigo,
                "descripcion": descripcion,
                "laboratorio": laboratorio,
                "precioProveedor": precio_float,
                "fechaCreacion": datetime.utcnow(),
                "fechaActualizacion": datetime.utcnow(),
                "usuarioCorreo": usuarioCorreo
            }
            
            if existing:
                # Actualizar existente
                await db.listas_precios_proveedores.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        **item_data,
                        "fechaCreacion": existing.get("fechaCreacion", datetime.utcnow())
                    }}
                )
            else:
                # Crear nuevo
                await db.listas_precios_proveedores.insert_one(item_data)
            
            items_guardados += 1
        
        return {
            "message": "Lista de precios cargada correctamente",
            "itemsProcessed": items_guardados,
            "proveedorId": proveedorId,
            "fecha": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar archivo Excel: {str(e)}")

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

@router.get("/buscar")
async def buscar_listas(
    q: Optional[str] = None,
    codigo: Optional[str] = None,
    nombre: Optional[str] = None,
    laboratorio: Optional[str] = None,
    proveedorId: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Buscar en listas comparativas"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    # Construir filtro
    filtro = {}
    
    if q:
        # Búsqueda general en código, descripción y laboratorio
        filtro["$or"] = [
            {"codigo": {"$regex": q, "$options": "i"}},
            {"descripcion": {"$regex": q, "$options": "i"}},
            {"laboratorio": {"$regex": q, "$options": "i"}}
        ]
    
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
        proveedor = await db.proveedores.find_one({"_id": lista_precio["proveedorId"]})
        costo, existencias = await obtener_info_inventario(db, lista_precio["codigo"])
        listas.append(lista_precio_helper(lista_precio, proveedor, costo, existencias))
    
    return listas

@router.get("/proveedor/{proveedor_id}")
async def obtener_listas_por_proveedor(
    proveedor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener listas de precios de un proveedor"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    # Validar proveedor
    proveedor = await db.proveedores.find_one({"_id": ObjectId(proveedor_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Obtener listas
    listas = []
    async for lista_precio in db.listas_precios_proveedores.find({"proveedorId": ObjectId(proveedor_id)}):
        costo, existencias = await obtener_info_inventario(db, lista_precio["codigo"])
        listas.append(lista_precio_helper(lista_precio, proveedor, costo, existencias))
    
    return listas

@router.delete("/{lista_id}")
async def eliminar_lista(
    lista_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un item de lista de precios"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    result = await db.listas_precios_proveedores.delete_one({"_id": ObjectId(lista_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item de lista de precios no encontrado")
    
    return {"message": "Item de lista de precios eliminado exitosamente", "id": lista_id}

@router.delete("/proveedor/{proveedor_id}")
async def eliminar_listas_por_proveedor(
    proveedor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar todas las listas de precios de un proveedor"""
    # Verificar permiso
    if "listas_comparativas" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para acceder a este recurso")
    
    db = get_database()
    
    # Validar proveedor
    proveedor = await db.proveedores.find_one({"_id": ObjectId(proveedor_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    result = await db.listas_precios_proveedores.delete_many({"proveedorId": ObjectId(proveedor_id)})
    
    return {
        "message": "Listas de precios eliminadas exitosamente",
        "itemsEliminados": result.deleted_count,
        "proveedorId": proveedor_id
    }
```

---

## 📝 Ejemplo de Implementación (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { ObjectId } = require('mongodb');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Helper para calcular precio con descuento
function calcularPrecioConDescuento(precio, descuentoComercial) {
    return precio * (1 - descuentoComercial / 100);
}

// Helper para obtener información del inventario
async function obtenerInfoInventario(db, codigo) {
    const inventarios = await db.collection('inventarios')
        .find({ codigo: codigo })
        .toArray();
    
    if (inventarios.length === 0) {
        return { costo: null, existencias: [] };
    }
    
    // Calcular costo promedio
    const costos = inventarios
        .map(inv => inv.costo || 0)
        .filter(c => c > 0);
    const costoPromedio = costos.length > 0 
        ? costos.reduce((a, b) => a + b, 0) / costos.length 
        : null;
    
    // Obtener nombres de farmacias
    const farmacias = await db.collection('farmacias').find({}).toArray();
    const farmaciasDict = {};
    farmacias.forEach(f => {
        farmaciasDict[f._id.toString()] = f.nombre || f._id.toString();
    });
    
    // Obtener existencias por farmacia
    const existencias = inventarios
        .filter(inv => inv.existencia > 0)
        .map(inv => ({
            farmacia: inv.farmacia || '',
            farmaciaNombre: farmaciasDict[inv.farmacia] || inv.farmacia || '',
            existencia: inv.existencia || 0
        }));
    
    return { costo: costoPromedio, existencias };
}

// Helper para formatear respuesta
async function formatearListaPrecio(db, listaPrecio) {
    const proveedor = await db.collection('proveedores')
        .findOne({ _id: listaPrecio.proveedorId });
    
    const { costo, existencias } = await obtenerInfoInventario(db, listaPrecio.codigo);
    
    const descuentoComercial = proveedor?.descuentosComerciales || 0;
    const precioConDescuento = calcularPrecioConDescuento(
        listaPrecio.precioProveedor,
        descuentoComercial
    );
    
    return {
        _id: listaPrecio._id.toString(),
        proveedorId: listaPrecio.proveedorId.toString(),
        proveedor: {
            _id: proveedor?._id.toString() || '',
            nombreJuridico: proveedor?.nombreJuridico || '',
            descuentosComerciales: descuentoComercial
        },
        codigo: listaPrecio.codigo,
        descripcion: listaPrecio.descripcion,
        laboratorio: listaPrecio.laboratorio || '',
        precioProveedor: listaPrecio.precioProveedor,
        precioConDescuento: Math.round(precioConDescuento * 100) / 100,
        miCosto: costo ? Math.round(costo * 100) / 100 : null,
        existencias: existencias,
        fechaCreacion: listaPrecio.fechaCreacion,
        fechaActualizacion: listaPrecio.fechaActualizacion
    };
}

// POST /listas-comparativas/excel
router.post('/excel', 
    authenticateToken,
    checkPermission('listas_comparativas'),
    upload.single('archivo'),
    async (req, res) => {
        try {
            const db = req.app.locals.db;
            const { proveedorId, usuarioCorreo } = req.body;
            
            if (!req.file) {
                return res.status(400).json({ detail: 'Archivo no proporcionado' });
            }
            
            // Validar proveedor
            const proveedor = await db.collection('proveedores')
                .findOne({ _id: new ObjectId(proveedorId) });
            if (!proveedor) {
                return res.status(404).json({ detail: 'Proveedor no encontrado' });
            }
            
            // Validar usuario
            const usuario = await db.collection('usuarios')
                .findOne({ correo: usuarioCorreo });
            if (!usuario) {
                return res.status(404).json({ detail: 'Usuario no encontrado' });
            }
            
            // Leer archivo Excel
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet);
            
            if (data.length === 0) {
                return res.status(400).json({ detail: 'El archivo Excel está vacío' });
            }
            
            // Obtener encabezados
            const headers = Object.keys(data[0]).map(h => h.toLowerCase().trim());
            
            // Buscar índices de columnas
            const codigoKey = headers.find(h => h.includes('codigo') || h.includes('código'));
            const descripcionKey = headers.find(h => h.includes('descripcion') || h.includes('descripción'));
            const laboratorioKey = headers.find(h => h.includes('laboratorio'));
            const precioKey = headers.find(h => h.includes('precio'));
            
            if (!codigoKey || !descripcionKey || !precioKey) {
                return res.status(400).json({ 
                    detail: 'El archivo Excel debe tener las columnas: codigo, descripcion, precio' 
                });
            }
            
            // Procesar datos
            let itemsGuardados = 0;
            for (const row of data) {
                const codigo = String(row[codigoKey] || '').trim();
                const descripcion = String(row[descripcionKey] || '').trim();
                const laboratorio = laboratorioKey ? String(row[laboratorioKey] || '').trim() : '';
                const precio = parseFloat(row[precioKey] || 0);
                
                if (!codigo || !descripcion || isNaN(precio) || precio < 0) {
                    continue;
                }
                
                // Verificar si ya existe
                const existing = await db.collection('listas_precios_proveedores')
                    .findOne({
                        codigo: codigo,
                        proveedorId: new ObjectId(proveedorId)
                    });
                
                const itemData = {
                    proveedorId: new ObjectId(proveedorId),
                    codigo: codigo,
                    descripcion: descripcion,
                    laboratorio: laboratorio,
                    precioProveedor: precio,
                    fechaCreacion: new Date(),
                    fechaActualizacion: new Date(),
                    usuarioCorreo: usuarioCorreo
                };
                
                if (existing) {
                    await db.collection('listas_precios_proveedores').updateOne(
                        { _id: existing._id },
                        { $set: {
                            ...itemData,
                            fechaCreacion: existing.fechaCreacion
                        }}
                    );
                } else {
                    await db.collection('listas_precios_proveedores').insertOne(itemData);
                }
                
                itemsGuardados++;
            }
            
            res.json({
                message: 'Lista de precios cargada correctamente',
                itemsProcessed: itemsGuardados,
                proveedorId: proveedorId,
                fecha: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ detail: 'Error al procesar archivo Excel: ' + error.message });
        }
    }
);

// GET /listas-comparativas
router.get('/', authenticateToken, checkPermission('listas_comparativas'), async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { codigo, nombre, laboratorio, proveedorId } = req.query;
        
        // Construir filtro
        const filtro = {};
        if (codigo) {
            filtro.codigo = { $regex: codigo, $options: 'i' };
        }
        if (nombre) {
            filtro.descripcion = { $regex: nombre, $options: 'i' };
        }
        if (laboratorio) {
            filtro.laboratorio = { $regex: laboratorio, $options: 'i' };
        }
        if (proveedorId) {
            filtro.proveedorId = new ObjectId(proveedorId);
        }
        
        const listas = await db.collection('listas_precios_proveedores')
            .find(filtro)
            .toArray();
        
        const listasFormateadas = await Promise.all(
            listas.map(lista => formatearListaPrecio(db, lista))
        );
        
        res.json(listasFormateadas);
    } catch (error) {
        res.status(500).json({ detail: 'Error al obtener listas comparativas: ' + error.message });
    }
});

// GET /listas-comparativas/buscar
router.get('/buscar', authenticateToken, checkPermission('listas_comparativas'), async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { q, codigo, nombre, laboratorio, proveedorId } = req.query;
        
        // Construir filtro
        const filtro = {};
        
        if (q) {
            filtro.$or = [
                { codigo: { $regex: q, $options: 'i' } },
                { descripcion: { $regex: q, $options: 'i' } },
                { laboratorio: { $regex: q, $options: 'i' } }
            ];
        }
        
        if (codigo) {
            filtro.codigo = { $regex: codigo, $options: 'i' };
        }
        if (nombre) {
            filtro.descripcion = { $regex: nombre, $options: 'i' };
        }
        if (laboratorio) {
            filtro.laboratorio = { $regex: laboratorio, $options: 'i' };
        }
        if (proveedorId) {
            filtro.proveedorId = new ObjectId(proveedorId);
        }
        
        const listas = await db.collection('listas_precios_proveedores')
            .find(filtro)
            .toArray();
        
        const listasFormateadas = await Promise.all(
            listas.map(lista => formatearListaPrecio(db, lista))
        );
        
        res.json(listasFormateadas);
    } catch (error) {
        res.status(500).json({ detail: 'Error al buscar listas: ' + error.message });
    }
});

// GET /listas-comparativas/proveedor/:proveedorId
router.get('/proveedor/:proveedorId', 
    authenticateToken, 
    checkPermission('listas_comparativas'),
    async (req, res) => {
        try {
            const db = req.app.locals.db;
            const { proveedorId } = req.params;
            
            // Validar proveedor
            const proveedor = await db.collection('proveedores')
                .findOne({ _id: new ObjectId(proveedorId) });
            if (!proveedor) {
                return res.status(404).json({ detail: 'Proveedor no encontrado' });
            }
            
            const listas = await db.collection('listas_precios_proveedores')
                .find({ proveedorId: new ObjectId(proveedorId) })
                .toArray();
            
            const listasFormateadas = await Promise.all(
                listas.map(lista => formatearListaPrecio(db, lista))
            );
            
            res.json(listasFormateadas);
        } catch (error) {
            res.status(500).json({ detail: 'Error al obtener listas del proveedor: ' + error.message });
        }
    }
);

// DELETE /listas-comparativas/:id
router.delete('/:id', authenticateToken, checkPermission('listas_comparativas'), async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        
        const result = await db.collection('listas_precios_proveedores')
            .deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ detail: 'Item de lista de precios no encontrado' });
        }
        
        res.json({
            message: 'Item de lista de precios eliminado exitosamente',
            id: id
        });
    } catch (error) {
        res.status(500).json({ detail: 'Error al eliminar item: ' + error.message });
    }
});

// DELETE /listas-comparativas/proveedor/:proveedorId
router.delete('/proveedor/:proveedorId', 
    authenticateToken, 
    checkPermission('listas_comparativas'),
    async (req, res) => {
        try {
            const db = req.app.locals.db;
            const { proveedorId } = req.params;
            
            // Validar proveedor
            const proveedor = await db.collection('proveedores')
                .findOne({ _id: new ObjectId(proveedorId) });
            if (!proveedor) {
                return res.status(404).json({ detail: 'Proveedor no encontrado' });
            }
            
            const result = await db.collection('listas_precios_proveedores')
                .deleteMany({ proveedorId: new ObjectId(proveedorId) });
            
            res.json({
                message: 'Listas de precios eliminadas exitosamente',
                itemsEliminados: result.deletedCount,
                proveedorId: proveedorId
            });
        } catch (error) {
            res.status(500).json({ detail: 'Error al eliminar listas: ' + error.message });
        }
    }
);

module.exports = router;
```

---

## ✅ Checklist de Implementación

- [ ] Agregar permiso `"listas_comparativas"` a la lista de permisos válidos
- [ ] Crear colección `listas_precios_proveedores` en MongoDB
- [ ] Crear índices recomendados en la colección
- [ ] Implementar endpoint POST `/listas-comparativas/excel` con procesamiento de Excel
- [ ] Implementar endpoint GET `/listas-comparativas` con filtros
- [ ] Implementar endpoint GET `/listas-comparativas/buscar` con búsqueda avanzada
- [ ] Implementar endpoint GET `/listas-comparativas/proveedor/{proveedorId}`
- [ ] Implementar endpoint DELETE `/listas-comparativas/{id}`
- [ ] Implementar endpoint DELETE `/listas-comparativas/proveedor/{proveedorId}`
- [ ] Implementar lógica de cálculo de precio con descuento comercial
- [ ] Implementar integración con inventarios para obtener costos y existencias
- [ ] Agregar autenticación a todos los endpoints
- [ ] Agregar validación de permisos a todos los endpoints
- [ ] Agregar manejo de errores apropiado
- [ ] Probar todos los endpoints con Postman o similar
- [ ] Verificar que el cálculo de descuentos sea correcto
- [ ] Verificar que la búsqueda funcione correctamente

---

## 🔍 Notas Adicionales

1. **Procesamiento de Excel**: Se recomienda usar librerías como `openpyxl` (Python) o `xlsx` (Node.js) para leer archivos Excel.

2. **Actualización de listas**: Si se sube una lista de precios para un proveedor que ya tiene listas, se recomienda:
   - Actualizar items existentes (mismo código)
   - Agregar nuevos items
   - Opcionalmente, eliminar items que ya no están en la nueva lista

3. **Rendimiento**: Para grandes volúmenes de datos, considera:
   - Paginación en los endpoints GET
   - Índices adicionales según los patrones de búsqueda más comunes
   - Caché de información de proveedores si es necesario

4. **Validación de datos**: Asegúrate de validar:
   - Formatos de archivo Excel
   - Tipos de datos (números, strings)
   - Valores negativos en precios
   - Códigos y descripciones no vacíos

5. **Relaciones**: Asegúrate de que:
   - Los `proveedorId` referencien proveedores existentes
   - Los códigos de productos coincidan con los del inventario (puede haber variaciones, considera normalización)

---

## 📞 Soporte

Si tienes dudas sobre la implementación, revisa:
- `INSTRUCCIONES_BACKEND_PROVEEDORES.md` - Para entender la estructura de proveedores
- `INSTRUCCIONES_BACKEND_INVENTARIOS_EXCEL.md` - Para entender la estructura de inventarios
- El código del frontend cuando esté implementado para ver cómo se consumen los endpoints

