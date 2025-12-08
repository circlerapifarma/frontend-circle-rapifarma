# INSTRUCCIONES BACKEND - MÓDULO DE ORDEN DE COMPRA

## 📋 DESCRIPCIÓN

El módulo de Orden de Compra permite a los usuarios crear órdenes de compra desde el módulo de Listas Comparativas, agrupándolas por farmacia y proveedor, y guardándolas en el sistema una vez "totalizadas".

---

## 🔐 PERMISOS

### Permiso requerido:
- `orden_compra`: Permite acceder al módulo de Orden de Compra

---

## 📊 MODELO DE DATOS

### Colección: `ordenes_compra`

```python
{
  "_id": ObjectId,
  "farmaciaId": str,  # ID de la farmacia
  "farmaciaNombre": str,  # Nombre de la farmacia
  "items": [
    {
      "listaId": str,  # ID de la lista comparativa original
      "codigo": str,
      "descripcion": str,
      "laboratorio": str,
      "precio": float,  # Precio original
      "descuento": float,  # Descuento en %
      "precioNeto": float,  # Precio con descuentos aplicados
      "cantidad": int,  # Cantidad solicitada
      "subtotal": float,  # precioNeto * cantidad
      "proveedorId": str,
      "proveedorNombre": str,
      "fechaVencimiento": str | null,  # ISO string o null
    }
  ],
  "total": float,  # Suma de todos los subtotales
  "usuarioCorreo": str,  # Correo del usuario que creó la orden
  "fechaCreacion": str,  # ISO string
  "estado": str,  # "preliminar" | "procesada" | "cancelada"
  "fechaProcesamiento": str | null,  # ISO string cuando se totaliza
}
```

---

## 🛠️ ENDPOINTS REQUERIDOS

### 1. `POST /ordenes-compra`

Crea una nueva orden de compra procesada (totalizada).

**Autenticación**: Requerida (Bearer Token)

**Permisos**: `orden_compra`

**Body**:
```json
{
  "farmaciaId": "01",
  "farmaciaNombre": "Santa Elena",
  "items": [
    {
      "listaId": "507f1f77bcf86cd799439011",
      "codigo": "ABC123",
      "descripcion": "Acetaminofén 500mg",
      "laboratorio": "Lab ABC",
      "precio": 1.00,
      "descuento": 5.0,
      "precioNeto": 0.95,
      "cantidad": 2,
      "subtotal": 1.90,
      "proveedorId": "507f1f77bcf86cd799439012",
      "proveedorNombre": "Proveedor XYZ",
      "fechaVencimiento": "2025-12-31T00:00:00.000Z"
    }
  ],
  "total": 1.90,
  "usuarioCorreo": "usuario@example.com",
  "fechaCreacion": "2025-12-07T20:00:00.000Z"
}
```

**Respuesta exitosa (201)**:
```json
{
  "message": "Orden de compra creada exitosamente",
  "ordenId": "507f1f77bcf86cd799439013",
  "farmaciaNombre": "Santa Elena",
  "total": 1.90,
  "itemsCount": 1
}
```

**Errores**:
- `400`: Datos inválidos
- `401`: No autenticado
- `403`: Sin permiso `orden_compra`

---

### 2. `GET /ordenes-compra`

Obtiene todas las órdenes de compra del usuario autenticado.

**Autenticación**: Requerida (Bearer Token)

**Permisos**: `orden_compra`

**Query Parameters** (opcionales):
- `farmaciaId`: Filtrar por farmacia
- `estado`: Filtrar por estado ("preliminar", "procesada", "cancelada")
- `fechaDesde`: Filtrar desde fecha (ISO string)
- `fechaHasta`: Filtrar hasta fecha (ISO string)

**Respuesta exitosa (200)**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "farmaciaId": "01",
    "farmaciaNombre": "Santa Elena",
    "items": [...],
    "total": 1.90,
    "usuarioCorreo": "usuario@example.com",
    "fechaCreacion": "2025-12-07T20:00:00.000Z",
    "estado": "procesada",
    "fechaProcesamiento": "2025-12-07T20:05:00.000Z"
  }
]
```

---

### 3. `GET /ordenes-compra/{ordenId}`

Obtiene una orden de compra específica por ID.

**Autenticación**: Requerida (Bearer Token)

**Permisos**: `orden_compra`

**Respuesta exitosa (200)**:
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "farmaciaId": "01",
  "farmaciaNombre": "Santa Elena",
  "items": [...],
  "total": 1.90,
  "usuarioCorreo": "usuario@example.com",
  "fechaCreacion": "2025-12-07T20:00:00.000Z",
  "estado": "procesada",
  "fechaProcesamiento": "2025-12-07T20:05:00.000Z"
}
```

**Errores**:
- `404`: Orden no encontrada
- `403`: El usuario no tiene acceso a esta orden

---

### 4. `PATCH /ordenes-compra/{ordenId}/cancelar`

Cancela una orden de compra (cambia estado a "cancelada").

**Autenticación**: Requerida (Bearer Token)

**Permisos**: `orden_compra`

**Respuesta exitosa (200)**:
```json
{
  "message": "Orden de compra cancelada",
  "ordenId": "507f1f77bcf86cd799439013",
  "estado": "cancelada"
}
```

---

## 🔧 IMPLEMENTACIÓN SUGERIDA

### Endpoint POST /ordenes-compra

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import MongoClient
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

# Modelos Pydantic
class ItemOrdenCompra(BaseModel):
    listaId: str
    codigo: str
    descripcion: str
    laboratorio: str
    precio: float
    descuento: float
    precioNeto: float
    cantidad: int
    subtotal: float
    proveedorId: str
    proveedorNombre: str
    fechaVencimiento: Optional[str] = None

class OrdenCompraCreate(BaseModel):
    farmaciaId: str
    farmaciaNombre: str
    items: List[ItemOrdenCompra]
    total: float
    usuarioCorreo: str
    fechaCreacion: str

@router.post("/ordenes-compra")
async def crear_orden_compra(
    orden_data: OrdenCompraCreate,
    current_user: dict = Depends(verificar_permiso_orden_compra)
):
    """
    Crea una nueva orden de compra procesada.
    """
    try:
        # Validar que el usuario tenga el permiso
        if "orden_compra" not in current_user.get("permisos", []):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para crear órdenes de compra"
            )
        
        # Validar datos
        if not orden_data.items:
            raise HTTPException(
                status_code=400,
                detail="La orden debe tener al menos un item"
            )
        
        if orden_data.total <= 0:
            raise HTTPException(
                status_code=400,
                detail="El total debe ser mayor a 0"
            )
        
        # Verificar que el total coincida con la suma de subtotales
        total_calculado = sum(item.subtotal for item in orden_data.items)
        if abs(total_calculado - orden_data.total) > 0.01:  # Tolerancia para errores de punto flotante
            raise HTTPException(
                status_code=400,
                detail=f"El total no coincide con la suma de subtotales. Total recibido: {orden_data.total}, Total calculado: {total_calculado}"
            )
        
        # Preparar documento para MongoDB
        orden_doc = {
            "farmaciaId": orden_data.farmaciaId,
            "farmaciaNombre": orden_data.farmaciaNombre,
            "items": [item.dict() for item in orden_data.items],
            "total": orden_data.total,
            "usuarioCorreo": orden_data.usuarioCorreo,
            "fechaCreacion": datetime.fromisoformat(orden_data.fechaCreacion.replace('Z', '+00:00')),
            "estado": "procesada",
            "fechaProcesamiento": datetime.utcnow(),
        }
        
        # Insertar en MongoDB
        resultado = await db.ordenes_compra.insert_one(orden_doc)
        
        return {
            "message": "Orden de compra creada exitosamente",
            "ordenId": str(resultado.inserted_id),
            "farmaciaNombre": orden_data.farmaciaNombre,
            "total": orden_data.total,
            "itemsCount": len(orden_data.items)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al crear orden de compra: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear orden de compra: {str(e)}"
        )
```

### Endpoint GET /ordenes-compra

```python
@router.get("/ordenes-compra")
async def obtener_ordenes_compra(
    farmaciaId: Optional[str] = None,
    estado: Optional[str] = None,
    fechaDesde: Optional[str] = None,
    fechaHasta: Optional[str] = None,
    current_user: dict = Depends(verificar_permiso_orden_compra)
):
    """
    Obtiene todas las órdenes de compra del usuario autenticado.
    """
    try:
        # Construir filtro
        filtro = {
            "usuarioCorreo": current_user.get("correo")
        }
        
        if farmaciaId:
            filtro["farmaciaId"] = farmaciaId
        
        if estado:
            filtro["estado"] = estado
        
        if fechaDesde:
            filtro["fechaCreacion"] = {
                "$gte": datetime.fromisoformat(fechaDesde.replace('Z', '+00:00'))
            }
        
        if fechaHasta:
            if "fechaCreacion" not in filtro:
                filtro["fechaCreacion"] = {}
            filtro["fechaCreacion"]["$lte"] = datetime.fromisoformat(fechaHasta.replace('Z', '+00:00'))
        
        # Obtener órdenes
        ordenes = await db.ordenes_compra.find(filtro).sort("fechaCreacion", -1).to_list(length=1000)
        
        # Convertir ObjectId a string y fechas a ISO
        for orden in ordenes:
            orden["_id"] = str(orden["_id"])
            orden["fechaCreacion"] = orden["fechaCreacion"].isoformat()
            if orden.get("fechaProcesamiento"):
                orden["fechaProcesamiento"] = orden["fechaProcesamiento"].isoformat()
        
        return ordenes
        
    except Exception as e:
        print(f"Error al obtener órdenes de compra: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener órdenes de compra: {str(e)}"
        )
```

---

## ✅ VALIDACIONES

1. **Validar permiso**: El usuario debe tener `orden_compra` en sus permisos
2. **Validar items**: La orden debe tener al menos un item
3. **Validar total**: El total debe coincidir con la suma de subtotales
4. **Validar farmacia**: La farmacia debe existir
5. **Validar proveedor**: Los proveedores deben existir

---

## 📝 ÍNDICES RECOMENDADOS

```python
# Índices para mejorar rendimiento
await db.ordenes_compra.create_index("usuarioCorreo")
await db.ordenes_compra.create_index("farmaciaId")
await db.ordenes_compra.create_index("estado")
await db.ordenes_compra.create_index("fechaCreacion")
await db.ordenes_compra.create_index([("usuarioCorreo", 1), ("fechaCreacion", -1)])
```

---

## 🔗 INTEGRACIÓN CON OTROS MÓDULOS

- **Listas Comparativas**: Los items provienen de las listas comparativas (`listaId`)
- **Proveedores**: Se referencia el proveedor por `proveedorId`
- **Farmacias**: Se referencia la farmacia por `farmaciaId`

---

## 📊 ESTADOS DE ORDEN

- **preliminar**: Orden en proceso (no se usa actualmente, las órdenes se crean directamente como "procesada")
- **procesada**: Orden totalizada y guardada
- **cancelada**: Orden cancelada

---

**Fecha de creación**: 2025-12-07
**Prioridad**: 🟡 MEDIA
**Estado**: ⚠️ PENDIENTE DE IMPLEMENTACIÓN
