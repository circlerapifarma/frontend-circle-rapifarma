# INSTRUCCIONES BACKEND - DEBUG DE VALIDACIÓN DE ITEMS

## 🚨 PROBLEMA IDENTIFICADO

El endpoint `/excel` está procesando el archivo Excel correctamente (2035 items extraídos), pero **TODOS los items están fallando la validación**:

```
[EXCEL_SERVICE] Items extraídos del Excel: 2035
[EXCEL_SERVICE] Items procesados: 0 operaciones preparadas
[EXCEL_SERVICE] Items para insertar: 0
[EXCEL_SERVICE] Items para actualizar: 0
[EXCEL_SERVICE] Items con error: 2035  ⚠️ TODOS LOS ITEMS FALLAN
[EXCEL_SERVICE] ⚠️ No hay operaciones para ejecutar
```

**Resultado**: 0 items insertados, 0 actualizados, aunque el Excel tiene 2035 items válidos.

---

## 🔍 CAUSAS POSIBLES

### 1. Validación de campos demasiado estricta

La validación puede estar rechazando items por:
- Campos `None` o vacíos cuando deberían ser opcionales
- Tipos de datos incorrectos (string vs number)
- Campos que no existen en el Excel pero son requeridos

### 2. Formato de datos incorrecto

Los datos del Excel pueden tener:
- Valores `None` o `NaN` que no se están manejando
- Tipos incorrectos (ej: precio como string en lugar de float)
- Campos con espacios o caracteres especiales

### 3. Mapeo de columnas incorrecto

El código puede estar buscando columnas con nombres diferentes a los del Excel.

---

## 🔧 SOLUCIÓN: AGREGAR LOGS DE DEBUG

Agregar logs detallados para ver **por qué** cada item está fallando:

### En la función `crear_items_desde_excel()`:

```python
# Después de procesar cada item, agregar logs de debug
items_con_error = 0
errores_detallados = {}  # Para contar tipos de errores

for item in items_procesados:
    try:
        # Validar campos requeridos
        if not item.get("codigo"):
            error_tipo = "codigo_faltante"
            errores_detallados[error_tipo] = errores_detallados.get(error_tipo, 0) + 1
            if items_con_error < 5:  # Log solo los primeros 5
                print(f"[DEBUG] Item rechazado - Código faltante: {item}")
            items_con_error += 1
            continue
        
        if not item.get("descripcion"):
            error_tipo = "descripcion_faltante"
            errores_detallados[error_tipo] = errores_detallados.get(error_tipo, 0) + 1
            if items_con_error < 5:
                print(f"[DEBUG] Item rechazado - Descripción faltante: {item}")
            items_con_error += 1
            continue
        
        if not item.get("laboratorio"):
            error_tipo = "laboratorio_faltante"
            errores_detallados[error_tipo] = errores_detallados.get(error_tipo, 0) + 1
            if items_con_error < 5:
                print(f"[DEBUG] Item rechazado - Laboratorio faltante: {item}")
            items_con_error += 1
            continue
        
        if item.get("precio") is None:
            error_tipo = "precio_faltante"
            errores_detallados[error_tipo] = errores_detallados.get(error_tipo, 0) + 1
            if items_con_error < 5:
                print(f"[DEBUG] Item rechazado - Precio faltante: {item}")
            items_con_error += 1
            continue
        
        # Intentar convertir precio a float
        try:
            precio = float(item.get("precio", 0))
        except (ValueError, TypeError) as e:
            error_tipo = "precio_invalido"
            errores_detallados[error_tipo] = errores_detallados.get(error_tipo, 0) + 1
            if items_con_error < 5:
                print(f"[DEBUG] Item rechazado - Precio inválido: {item.get('precio')} - Error: {e}")
            items_con_error += 1
            continue
        
        # Si llegamos aquí, el item es válido
        # ... resto del código de procesamiento ...
        
    except Exception as e:
        error_tipo = f"error_general: {type(e).__name__}"
        errores_detallados[error_tipo] = errores_detallados.get(error_tipo, 0) + 1
        if items_con_error < 5:
            print(f"[DEBUG] Item rechazado - Error general: {item} - Error: {e}")
            import traceback
            traceback.print_exc()
        items_con_error += 1
        continue

# Al final, mostrar resumen de errores
print(f"[EXCEL_SERVICE] Resumen de errores:")
for error_tipo, cantidad in errores_detallados.items():
    print(f"[EXCEL_SERVICE] - {error_tipo}: {cantidad} items")
```

### Log del primer item procesado (ya existe, pero verificar que muestre todos los campos):

```python
# Al inicio del procesamiento, mostrar el primer item completo
if items_procesados:
    primer_item = items_procesados[0]
    print(f"[EXCEL_SERVICE] Primer item a procesar (completo):")
    print(f"[EXCEL_SERVICE] {primer_item}")
    print(f"[EXCEL_SERVICE] Tipo de datos:")
    for key, value in primer_item.items():
        print(f"[EXCEL_SERVICE]   - {key}: {value} (tipo: {type(value).__name__})")
```

---

## 📋 CHECKLIST DE VALIDACIÓN

Verificar que la validación permita:

- [ ] **Código**: Puede ser string vacío o debe ser requerido?
- [ ] **Descripción**: Puede ser string vacío o debe ser requerido?
- [ ] **Laboratorio**: Puede ser `None`, string vacío, o debe ser requerido?
- [ ] **Precio**: Puede ser `0`, `None`, o debe ser > 0?
- [ ] **Descuento**: Puede ser `None` o `0`?
- [ ] **Fecha de vencimiento**: Puede ser `None`?
- [ ] **Existencia**: Puede ser `0` o `None`?

### Ejemplo de validación más flexible:

```python
# Validación más flexible
codigo = str(item.get("codigo", "")).strip()
descripcion = str(item.get("descripcion", "")).strip()
laboratorio = str(item.get("laboratorio", "")).strip() if item.get("laboratorio") else ""

# Solo rechazar si código Y descripción están vacíos
if not codigo and not descripcion:
    continue  # Saltar item inválido

# Precio puede ser 0, pero debe ser un número válido
try:
    precio = float(item.get("precio", 0) or 0)
except (ValueError, TypeError):
    precio = 0  # Usar 0 como default en lugar de rechazar

# Descuento puede ser None o 0
descuento = float(item.get("descuento", 0) or 0)

# Existencia puede ser 0
existencia = int(item.get("existencia", 0) or 0)
```

---

## 🐛 DEBUGGING PASO A PASO

### Paso 1: Ver el primer item completo

Agregar al inicio de `crear_items_desde_excel()`:

```python
print(f"[DEBUG] Primer item recibido:")
import json
print(json.dumps(items_procesados[0] if items_procesados else {}, indent=2, default=str))
```

### Paso 2: Ver qué campos tiene el item

```python
print(f"[DEBUG] Campos del primer item:")
for key in items_procesados[0].keys():
    print(f"  - {key}")
```

### Paso 3: Ver qué validación está fallando

Agregar logs antes de cada `continue` en las validaciones:

```python
if not item.get("codigo"):
    print(f"[DEBUG] Item {i}: FALLA validación de código - valor: {item.get('codigo')}")
    continue
```

### Paso 4: Ver el item después de todas las transformaciones

```python
# Después de procesar el item (antes de agregarlo a operaciones)
print(f"[DEBUG] Item procesado (antes de agregar a operaciones):")
print(json.dumps(item_data, indent=2, default=str))
```

---

## 📝 FORMATO ESPERADO DEL ITEM

El item que llega a `crear_items_desde_excel()` debe tener esta estructura:

```python
{
    "codigo": "ABC123",  # string, requerido
    "descripcion": "Producto XYZ",  # string, requerido
    "laboratorio": "Lab ABC",  # string, puede ser vacío
    "precio": 10.50,  # float, requerido
    "descuento": 5.0,  # float, opcional (puede ser 0)
    "precioNeto": 9.98,  # float, calculado
    "fechaVencimiento": "2025-12-31",  # string ISO o None
    "existencia": 100  # int, opcional (puede ser 0)
}
```

**Verificar que el código que procesa el Excel esté generando items con esta estructura.**

---

## 🔍 VERIFICAR PROCESAMIENTO DEL EXCEL

El problema puede estar en cómo se procesa el Excel **antes** de llegar a `crear_items_desde_excel()`.

Verificar en el endpoint `/excel`:

```python
# Después de procesar el Excel
print(f"[EXCEL] Primer item extraído del Excel:")
if items:
    primer_item = items[0]
    print(f"[EXCEL] {primer_item}")
    print(f"[EXCEL] Tipos:")
    for key, value in primer_item.items():
        print(f"[EXCEL]   {key}: {value} (tipo: {type(value).__name__})")
```

---

## ✅ SOLUCIÓN RÁPIDA (TEMPORAL)

Si necesitas una solución rápida mientras se debuggea, hacer la validación más permisiva:

```python
# Validación mínima (solo rechazar items completamente vacíos)
if not any([
    item.get("codigo"),
    item.get("descripcion"),
    item.get("laboratorio")
]):
    continue  # Solo rechazar si TODOS los campos están vacíos

# Usar valores por defecto para campos opcionales
codigo = str(item.get("codigo", "")).strip() or "SIN_CODIGO"
descripcion = str(item.get("descripcion", "")).strip() or "SIN_DESCRIPCION"
laboratorio = str(item.get("laboratorio", "")).strip() or ""
precio = float(item.get("precio", 0) or 0)
descuento = float(item.get("descuento", 0) or 0)
existencia = int(item.get("existencia", 0) or 0)
```

---

## 📊 LOGS ESPERADOS DESPUÉS DE LA CORRECCIÓN

```
[EXCEL_SERVICE] Items extraídos del Excel: 2035
[EXCEL_SERVICE] Primer item a procesar (completo):
[EXCEL_SERVICE] {'codigo': 'ABC123', 'descripcion': 'Producto', ...}
[EXCEL_SERVICE] Items procesados: 2035 operaciones preparadas
[EXCEL_SERVICE] Items para insertar: 2035
[EXCEL_SERVICE] Items para actualizar: 0
[EXCEL_SERVICE] Items con error: 0
[EXCEL_SERVICE] ✅ bulk_write completado:
[EXCEL_SERVICE] - Insertados: 2035
[EXCEL_SERVICE] - Actualizados: 0
```

---

**Fecha**: 2025-12-07
**Prioridad**: 🔴 CRÍTICA
**Estado**: ⚠️ PENDIENTE DE DEBUG

