# Guiones de audio para Revoicer

> Lista de los **55 audios** que Christian debe generar con [Revoicer](https://revoicer.com/) para reemplazar los placeholders vacíos en `src/assets/audio/`.

Ver [STATUS_HUMAN.md tarea 5](../STATUS_HUMAN.md) para el contexto completo.

## Configuración recomendada en Revoicer

- **Idioma**: Spanish (Latin America) — más cercano al castellano panameño/ecuatoriano que Nelson reconoce.
- **Voz**: probar 2-3 voces masculinas cálidas. Sugerencia inicial: "Mateo", "Diego", o equivalente.
- **Velocidad**: 0.95x (un pelín más lento que default — la afasia receptiva de Nelson agradece pausas).
- **Pitch**: default.
- **Formato salida**: MP3.

## Flujo recomendado

1. Generar todos los audios en una sola sesión (más rápido y consistente).
2. Descargar cada uno con el nombre que aparece en la columna "Filename".
3. Reemplazar los placeholders vacíos en `src/assets/audio/`.
4. Probar localmente: `npx serve src/`, abrir `/patient.html`, tocar el botón 🔊 → debe sonar la voz Revoicer.
5. Commit: `git add src/assets/audio/ && git commit -m "feat(audio): voces Revoicer"`.

## Prioridad si tienes que ir por partes

1. Primero los **8 audios del día del vuelo** (`20260501_*.mp3`) — son los que más importan.
2. Luego los **6 audios del 2 de mayo** (primer día en Cuenca con altitud).
3. Luego los días 30 abril y 24 abril (vigilancia máxima).
4. Por último los días intermedios (más rutinarios).

---

## Tabla completa por día

### Vie 24 Abr — 🔴 vigilancia máxima

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 08:00 | 💊 med | `20260424_0800.mp3` | Buenos días Nelson. Es hora de tomar tu amlodipino y clopidogrel. Tómalos con el desayuno. |
| 13:41 | 💊 med | `20260424_1341.mp3` | Nelson, es hora de tomar el nebivolol. Es media pastilla. Tómala con algo de comer. |
| 15:30 | ❤️ vital | `20260424_1530.mp3` | Nelson, por favor tómate la presión ahora. Anota los valores en pantalla. |
| 17:30 | ❤️ vital | `20260424_1730.mp3` | Nelson, vuelve a tomarte la presión. Es importante registrarla ahora. |
| 21:00 | 💊 med | `20260424_2100.mp3` | Buenas noches Nelson. Es hora de la simvastatina. Tómala antes de dormir. |

### Sáb 25 Abr — 🟡

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 07:00 | ❤️ vital | `20260425_0700.mp3` | Buenos días Nelson. Antes de levantarte, tómate la presión en cama. |
| 08:00 | 💊 med | `20260425_0800.mp3` | Nelson, es hora del clopidogrel y el nebivolol. Tómalos con el desayuno. |
| 10:30 | ❤️ vital | `20260425_1030.mp3` | Nelson, tómate la presión ahora. Es el momento de mayor efecto del nebivolol. |
| 12:00 | ❤️ vital | `20260425_1200.mp3` | Nelson, mide tu presión y anota los valores. |
| 21:00 | 💊 med | `20260425_2100.mp3` | Buenas noches Nelson. Es hora de la tamsulosina y la simvastatina. Tómalas después de cenar. |
| 23:00 | ❤️ vital | `20260425_2300.mp3` | Nelson, una última medición antes de dormir. Tómate la presión. |

### Dom 26 Abr — 🔴

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 07:00 | ❤️ vital | `20260426_0700.mp3` | Buenos días Nelson. Antes de levantarte, mide tu presión en cama. |
| 08:00 | 💊 med | `20260426_0800.mp3` | Nelson, hoy tomas tres pastillas de la mañana: amlodipino, clopidogrel y media de nebivolol. Con desayuno completo. |
| 10:30 | ❤️ vital | `20260426_1030.mp3` | Nelson, tómate la presión ahora. Es importante registrarla. |
| 14:00 | ❤️ vital | `20260426_1400.mp3` | Nelson, es hora de medir la presión de la tarde. |
| 18:00 | ❤️ vital | `20260426_1800.mp3` | Nelson, una medición más antes de la cena. |
| 21:00 | 💊 med | `20260426_2100.mp3` | Buenas noches Nelson. Solo la simvastatina esta noche. |

### Lun 27 Abr — 🟡

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 07:00 | ❤️ vital | `20260427_0700.mp3` | Buenos días Nelson. Mide tu presión antes de levantarte. |
| 08:00 | 💊 med | `20260427_0800.mp3` | Nelson, clopidogrel y nebivolol con el desayuno. |
| 10:30 | ❤️ vital | `20260427_1030.mp3` | Nelson, tómate la presión ahora. |
| 21:00 | 💊 med | `20260427_2100.mp3` | Buenas noches Nelson. Tamsulosina y simvastatina después de cenar. |
| 23:00 | ❤️ vital | `20260427_2300.mp3` | Nelson, última presión del día antes de dormir. |

### Mar 28 Abr — 🔴

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 07:00 | ❤️ vital | `20260428_0700.mp3` | Buenos días Nelson. Presión antes de levantarte. |
| 08:00 | 💊 med | `20260428_0800.mp3` | Nelson, tus tres pastillas de la mañana: amlodipino, clopidogrel y media de nebivolol. Con desayuno. |
| 10:30 | ❤️ vital | `20260428_1030.mp3` | Nelson, tómate la presión ahora. |
| 14:00 | ❤️ vital | `20260428_1400.mp3` | Nelson, presión de la tarde. |
| 21:00 | 💊 med | `20260428_2100.mp3` | Buenas noches. Solo la simvastatina esta noche. |

### Mié 29 Abr — 🟡

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 08:00 | 💊 med | `20260429_0800.mp3` | Buenos días Nelson. Clopidogrel y nebivolol con el desayuno. |
| 10:30 | ❤️ vital | `20260429_1030.mp3` | Nelson, tómate la presión. |
| 21:00 | 💊 med | `20260429_2100.mp3` | Buenas noches Nelson. Tamsulosina y simvastatina después de cenar. |

### Jue 30 Abr — 🔴 víspera del vuelo

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 07:00 | ❤️ vital | `20260430_0700.mp3` | Buenos días Nelson. Mañana es el viaje. Mide tu presión antes de levantarte. |
| 08:00 | 💊 med | `20260430_0800.mp3` | Nelson, tus pastillas de la mañana para el viaje de mañana: amlodipino, clopidogrel y media de nebivolol. |
| 10:30 | ❤️ vital | `20260430_1030.mp3` | Nelson, anota esta presión. Es tu medición de referencia para el viaje. |
| 14:00 | ❤️ vital | `20260430_1400.mp3` | Nelson, presión de la tarde. |
| 18:00 | ❤️ vital | `20260430_1800.mp3` | Nelson, última comida grande del día. Come bien y bebe agua extra. |
| 19:00 | ❤️ vital | `20260430_1900.mp3` | Nelson, presión antes de la cena. |
| 21:00 | 💊 med | `20260430_2100.mp3` | Nelson, simvastatina. Esta noche NO hay tamsulosina. Es para que el viaje sea más seguro. |

### Vie 1 May — ✈️ VUELO Panamá → Cuenca

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 06:00 | ❤️ vital | `20260501_0600.mp3` | Nelson, buenos días. Hoy es el día del viaje. Mide tu presión en cama antes de levantarte. Es muy importante. |
| 06:30 | 🌿 meal | `20260501_0630.mp3` | Nelson, desayuna bien ahora. Avena con fruta. Toma agua. El desayuno es obligatorio antes de las pastillas. |
| 07:00 | 💊 med | `20260501_0700.mp3` | Nelson, dos pastillas: clopidogrel y nebivolol. Hoy NO hay amlodipino. Eso es correcto para el vuelo. |
| 07:30 | ❤️ vital | `20260501_0730.mp3` | Nelson, última medición antes de salir. Anota los valores. |
| 09:00 | ✈️ reminder | `20260501_0900.mp3` | Nelson, ya estás en el avión. Mueve los pies cada treinta minutos. Bebe agua seguido. |
| 11:00 | ❤️ vital | `20260501_1100.mp3` | Nelson, mide tu presión durante el vuelo y anota los valores. |
| 14:30 | ✈️ reminder | `20260501_1430.mp3` | Llegaste a Guayaquil Nelson. Descansa dos horas antes de salir a Cuenca. Come algo y bebe agua. |
| 21:00 | 💊 med | `20260501_2100.mp3` | Buenas noches Nelson. Llegaste a Cuenca. Tamsulosina y simvastatina después de cenar. Lo hiciste muy bien hoy. |

### Sáb 2 May — 🔴 Cuenca, día 1 (altitud)

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 07:00 | ❤️ vital | `20260502_0700.mp3` | Buenos días Nelson. Estás en Cuenca. La altura puede subir la presión. Mídela antes de levantarte. |
| 08:00 | 💊 med | `20260502_0800.mp3` | Nelson, tus tres pastillas de la mañana. Con desayuno completo. |
| 12:00 | ❤️ vital | `20260502_1200.mp3` | Nelson, es el mediodía. Mide tu presión. |
| 16:00 | ❤️ vital | `20260502_1600.mp3` | Nelson, presión de la tarde. |
| 20:00 | ❤️ vital | `20260502_2000.mp3` | Nelson, presión antes de cenar. |
| 21:00 | 💊 med | `20260502_2100.mp3` | Buenas noches Nelson. Tamsulosina y simvastatina después de cenar. |

### Dom 3 May — 🟡 Cuenca, último día protocolo

| Hora | Tipo | Filename | Guion (pegar en Revoicer) |
|------|------|----------|---------------------------|
| 07:00 | ❤️ vital | `20260503_0700.mp3` | Buenos días Nelson. Mide tu presión. |
| 08:00 | 💊 med | `20260503_0800.mp3` | Nelson, clopidogrel y nebivolol con el desayuno. |
| 12:00 | ❤️ vital | `20260503_1200.mp3` | Nelson, presión del mediodía. |
| 21:00 | 💊 med | `20260503_2100.mp3` | Buenas noches Nelson. Tamsulosina y simvastatina. |

---

## Apéndice — guiones en formato batch

Si Revoicer permite procesar un batch, este es el listado plano con `filename | speech`:

```
20260424_0800.mp3 | Buenos días Nelson. Es hora de tomar tu amlodipino y clopidogrel. Tómalos con el desayuno.
20260424_1341.mp3 | Nelson, es hora de tomar el nebivolol. Es media pastilla. Tómala con algo de comer.
20260424_1530.mp3 | Nelson, por favor tómate la presión ahora. Anota los valores en pantalla.
20260424_1730.mp3 | Nelson, vuelve a tomarte la presión. Es importante registrarla ahora.
20260424_2100.mp3 | Buenas noches Nelson. Es hora de la simvastatina. Tómala antes de dormir.
20260425_0700.mp3 | Buenos días Nelson. Antes de levantarte, tómate la presión en cama.
20260425_0800.mp3 | Nelson, es hora del clopidogrel y el nebivolol. Tómalos con el desayuno.
20260425_1030.mp3 | Nelson, tómate la presión ahora. Es el momento de mayor efecto del nebivolol.
20260425_1200.mp3 | Nelson, mide tu presión y anota los valores.
20260425_2100.mp3 | Buenas noches Nelson. Es hora de la tamsulosina y la simvastatina. Tómalas después de cenar.
20260425_2300.mp3 | Nelson, una última medición antes de dormir. Tómate la presión.
20260426_0700.mp3 | Buenos días Nelson. Antes de levantarte, mide tu presión en cama.
20260426_0800.mp3 | Nelson, hoy tomas tres pastillas de la mañana: amlodipino, clopidogrel y media de nebivolol. Con desayuno completo.
20260426_1030.mp3 | Nelson, tómate la presión ahora. Es importante registrarla.
20260426_1400.mp3 | Nelson, es hora de medir la presión de la tarde.
20260426_1800.mp3 | Nelson, una medición más antes de la cena.
20260426_2100.mp3 | Buenas noches Nelson. Solo la simvastatina esta noche.
20260427_0700.mp3 | Buenos días Nelson. Mide tu presión antes de levantarte.
20260427_0800.mp3 | Nelson, clopidogrel y nebivolol con el desayuno.
20260427_1030.mp3 | Nelson, tómate la presión ahora.
20260427_2100.mp3 | Buenas noches Nelson. Tamsulosina y simvastatina después de cenar.
20260427_2300.mp3 | Nelson, última presión del día antes de dormir.
20260428_0700.mp3 | Buenos días Nelson. Presión antes de levantarte.
20260428_0800.mp3 | Nelson, tus tres pastillas de la mañana: amlodipino, clopidogrel y media de nebivolol. Con desayuno.
20260428_1030.mp3 | Nelson, tómate la presión ahora.
20260428_1400.mp3 | Nelson, presión de la tarde.
20260428_2100.mp3 | Buenas noches. Solo la simvastatina esta noche.
20260429_0800.mp3 | Buenos días Nelson. Clopidogrel y nebivolol con el desayuno.
20260429_1030.mp3 | Nelson, tómate la presión.
20260429_2100.mp3 | Buenas noches Nelson. Tamsulosina y simvastatina después de cenar.
20260430_0700.mp3 | Buenos días Nelson. Mañana es el viaje. Mide tu presión antes de levantarte.
20260430_0800.mp3 | Nelson, tus pastillas de la mañana para el viaje de mañana: amlodipino, clopidogrel y media de nebivolol.
20260430_1030.mp3 | Nelson, anota esta presión. Es tu medición de referencia para el viaje.
20260430_1400.mp3 | Nelson, presión de la tarde.
20260430_1800.mp3 | Nelson, última comida grande del día. Come bien y bebe agua extra.
20260430_1900.mp3 | Nelson, presión antes de la cena.
20260430_2100.mp3 | Nelson, simvastatina. Esta noche NO hay tamsulosina. Es para que el viaje sea más seguro.
20260501_0600.mp3 | Nelson, buenos días. Hoy es el día del viaje. Mide tu presión en cama antes de levantarte. Es muy importante.
20260501_0630.mp3 | Nelson, desayuna bien ahora. Avena con fruta. Toma agua. El desayuno es obligatorio antes de las pastillas.
20260501_0700.mp3 | Nelson, dos pastillas: clopidogrel y nebivolol. Hoy NO hay amlodipino. Eso es correcto para el vuelo.
20260501_0730.mp3 | Nelson, última medición antes de salir. Anota los valores.
20260501_0900.mp3 | Nelson, ya estás en el avión. Mueve los pies cada treinta minutos. Bebe agua seguido.
20260501_1100.mp3 | Nelson, mide tu presión durante el vuelo y anota los valores.
20260501_1430.mp3 | Llegaste a Guayaquil Nelson. Descansa dos horas antes de salir a Cuenca. Come algo y bebe agua.
20260501_2100.mp3 | Buenas noches Nelson. Llegaste a Cuenca. Tamsulosina y simvastatina después de cenar. Lo hiciste muy bien hoy.
20260502_0700.mp3 | Buenos días Nelson. Estás en Cuenca. La altura puede subir la presión. Mídela antes de levantarte.
20260502_0800.mp3 | Nelson, tus tres pastillas de la mañana. Con desayuno completo.
20260502_1200.mp3 | Nelson, es el mediodía. Mide tu presión.
20260502_1600.mp3 | Nelson, presión de la tarde.
20260502_2000.mp3 | Nelson, presión antes de cenar.
20260502_2100.mp3 | Buenas noches Nelson. Tamsulosina y simvastatina después de cenar.
20260503_0700.mp3 | Buenos días Nelson. Mide tu presión.
20260503_0800.mp3 | Nelson, clopidogrel y nebivolol con el desayuno.
20260503_1200.mp3 | Nelson, presión del mediodía.
20260503_2100.mp3 | Buenas noches Nelson. Tamsulosina y simvastatina.
```
