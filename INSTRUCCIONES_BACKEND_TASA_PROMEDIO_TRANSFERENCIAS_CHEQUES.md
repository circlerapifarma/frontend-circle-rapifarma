# Instrucciones Backend - Tasa Promedio en Transferencias y Cheques

## 📋 Cambio en el Frontend

El frontend ahora usa la **tasa promedio** calculada de todos los movimientos del banco para realizar transferencias y cheques, en lugar de pedir la tasa del día al usuario.

### Comportamiento Actual

**Para Transferencias y Cheques:**
- El usuario ingresa el monto en **Bs**
- El frontend calcula la tasa promedio de todos los movimientos del banco
- El frontend convierte el monto a USD usando la tasa promedio: `monto_usd = monto_bs / tasa_promedio`
- El frontend envía al backend:
  - `monto`: Monto en USD (convertido usando tasa promedio)
  - `montoOriginal`: Monto original en Bs
  - `tasa`: Tasa promedio usada

**Para Depósitos:**
- El usuario ingresa el monto en **Bs** y la **tasa del día**
- El frontend convierte usando la tasa del día ingresada
- El frontend envía al backend:
  - `monto`: Monto en USD (convertido usando tasa del día)
  - `montoOriginal`: Monto original en Bs
  - `tasa`: Tasa del día ingresada por el usuario

---

## 🔧 Verificación del Backend

### Endpoint: `POST /bancos/{id}/transferencia`

El backend debe:

1. **Recibir los datos correctamente:**
   ```json
   {
     "monto": 133.33,           // Monto en USD (convertido con tasa promedio)
     "montoOriginal": 40000,    // Monto original en Bs
     "tasa": 300,               // Tasa promedio usada
     "detalles": "Transferencia",
     "nombreTitular": "Juan Pérez"
   }
   ```

2. **Validar que el monto no exceda el disponible:**
   - El disponible se guarda en Bs, así que validar contra `banco.disponible`
   - O convertir el monto a Bs usando la tasa promedio para validar

3. **Restar del disponible:**
   - Restar el `montoOriginal` (en Bs) del `banco.disponible`
   - Calcular el nuevo `disponibleUsd` usando la tasa promedio o recalculando desde movimientos

4. **Guardar el movimiento:**
   ```python
   movimiento = {
       "bancoId": ObjectId(id),
       "tipo": "transferencia",
       "monto": monto_usd,              # Monto en USD
       "montoUsd": monto_usd,           # Monto en USD
       "montoOriginal": monto_original_bs,  # Monto original en Bs
       "tipoMonedaBanco": "Bs",
       "tasaUsada": tasa_promedio,      # Tasa promedio usada
       "nombreTitular": nombre_titular,
       "detalles": detalles,
       "fecha": datetime.utcnow().strftime("%Y-%m-%d"),
       "createdAt": datetime.utcnow(),
       "updatedAt": datetime.utcnow()
   }
   ```

### Endpoint: `POST /bancos/{id}/cheque`

El backend debe hacer exactamente lo mismo que para transferencias:

1. Recibir `monto`, `montoOriginal`, `tasa` (tasa promedio)
2. Validar que no exceda el disponible
3. Restar del disponible
4. Guardar el movimiento con la información completa

---

## ⚠️ Importante

### Validación del Disponible

El backend debe validar que el monto a transferir/chequear no exceda el disponible. Como el disponible se guarda en Bs:

```python
# Validar que el monto en Bs no exceda el disponible
if monto_original_bs > banco["disponible"]:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El monto excede el disponible del banco"
    )
```

### Actualización del Disponible

Después de restar, actualizar el disponible:

```python
# Restar del disponible (en Bs)
nuevo_disponible = banco["disponible"] - monto_original_bs

# Recalcular disponibleUsd
# Opción 1: Usar tasa promedio recibida
nuevo_disponible_usd = nuevo_disponible / tasa_promedio

# Opción 2: Recalcular desde todos los movimientos (más preciso)
# Sumar todos los movimientos en USD para obtener el disponibleUsd real

await db.bancos.update_one(
    {"_id": ObjectId(id)},
    {
        "$set": {
            "disponible": nuevo_disponible,
            "disponibleUsd": nuevo_disponible_usd,
            "updatedAt": datetime.utcnow()
        }
    }
)
```

---

## 📊 Ejemplo de Flujo

### Caso: Transferencia de 40.000 Bs con tasa promedio 300

1. **Frontend calcula:**
   - Tasa promedio: 300 (calculada de todos los movimientos)
   - Monto en USD: 40.000 / 300 = 133,33 USD

2. **Frontend envía:**
   ```json
   {
     "monto": 133.33,
     "montoOriginal": 40000,
     "tasa": 300,
     "detalles": "Transferencia",
     "nombreTitular": "Juan Pérez"
   }
   ```

3. **Backend procesa:**
   - Valida: 40.000 Bs <= disponible del banco
   - Resta: `disponible = disponible - 40.000`
   - Calcula: `disponibleUsd = disponible / 300` (o recalcula desde movimientos)
   - Guarda movimiento con `tasaUsada: 300`

---

## ✅ Checklist de Verificación

- [ ] El endpoint de transferencia recibe `montoOriginal` y `tasa` (tasa promedio)
- [ ] El endpoint de cheque recibe `montoOriginal` y `tasa` (tasa promedio)
- [ ] Se valida que el monto no exceda el disponible (en Bs)
- [ ] Se resta correctamente del disponible (en Bs)
- [ ] Se actualiza el `disponibleUsd` correctamente
- [ ] Se guarda el movimiento con `montoOriginal`, `montoUsd`, y `tasaUsada`
- [ ] El movimiento tiene `tipoMonedaBanco: "Bs"`

---

## 🔍 Notas Adicionales

1. **La tasa promedio puede cambiar:** Cada vez que se hace un depósito con una tasa diferente, la tasa promedio cambia. El frontend recalcula la tasa promedio antes de abrir el modal de transferencia/cheque.

2. **Consistencia:** El backend debe asegurarse de que el `disponibleUsd` siempre refleje la suma real de todos los movimientos en USD, no solo una división simple del disponible en Bs por una tasa.

3. **Si no hay movimientos:** Si el banco no tiene movimientos, el frontend no permitirá hacer transferencias/cheques (mostrará un error). El backend debe manejar este caso también.

---

## 🧪 Testing

Prueba los siguientes casos:

1. ✅ Transferencia en banco Bs con tasa promedio válida
2. ✅ Cheque en banco Bs con tasa promedio válida
3. ✅ Validar que se resta correctamente del disponible
4. ✅ Verificar que el movimiento se guarda con la tasa promedio
5. ✅ Verificar que el disponibleUsd se actualiza correctamente

