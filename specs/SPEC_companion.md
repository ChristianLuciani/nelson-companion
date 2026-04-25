# SPEC — Nelson Companion Core

## Contexto del usuario
Nelson Luciani, 76 años. Afasia de Broca post-ACV. Entiende bien el lenguaje pero tiene
dificultad para producir habla y texto. El sistema debe ser operable sin leer texto extenso.

## Principios de diseño
1. **Voz primero**: cada acción tiene su contraparte hablada
2. **Un foco a la vez**: solo mostrar qué hacer AHORA
3. **Botones grandes**: mínimo 60px de altura, 44px de ancho
4. **Color guía acción**: verde=hecho, amarillo=pendiente, rojo=urgente
5. **Auditabilidad**: todo registro queda con timestamp

## Especificaciones funcionales

### F-001 Reloj sincronizado
- La app lee la hora real del dispositivo cada 30 segundos
- Muestra hora prominente (≥ 38px) en el encabezado
- Determina automáticamente el slot actual y el siguiente

### F-002 Medicación
- Cada medicamento es un botón táctil grande con foto de la pastilla
- Un toque marca como tomado + voz de confirmación
- El estado persiste en localStorage
- El historial es exportable en CSV

### F-003 Signos vitales
- Tres campos numéricos grandes: Sistólica / Diastólica / Pulso
- inputmode="numeric" para teclado numérico en móvil
- Valor guardado en localStorage al perder foco
- Visible en vista "Presión" con resumen del día

### F-004 Síntesis de voz (TTS)
Ver SPEC_voice.md

### F-005 Foto de pastillas
- Cada medicamento tiene un slot de foto
- El usuario puede tomar foto con la cámara del dispositivo
- La foto se guarda en localStorage como base64
- Se muestra como thumbnail junto al nombre en el botón de medicación

### F-006 Exportación
- Botón "CSV" genera archivo con toda la semana
- Columnas: date, slotId, time, type, med, dose, checked, sys, dia, pul, note
- Legible por cualquier herramienta médica o hoja de cálculo

## Especificaciones de accesibilidad
- Contraste mínimo 4.5:1 para todo texto
- Tamaño de fuente mínimo 13px
- Tamaño de toque mínimo 44×44px (Apple HIG) preferentemente 60px
- No depender únicamente del color para comunicar estado
- La voz es complementaria, no el único canal

## Criterios de aceptación (BDD)

```gherkin
Feature: Medicación diaria

  Scenario: Nelson toma el amlodipino
    Given es las 08:00 del 26 de abril
    And la app muestra el slot de las 08:00
    When Nelson toca el botón "Amlodipino 2.5mg"
    Then el botón cambia a estado "tomado" (verde, tachado)
    And la app dice "Muy bien Nelson. Pastilla registrada."
    And el registro se guarda con timestamp

  Scenario: Auto-aviso de medición de presión
    Given la voz está activada
    And es las 10:30 del 26 de abril
    And no se ha hablado el slot "20260426_1030" todavía
    When han pasado menos de 5 minutos desde las 10:30
    Then la app dice "Nelson, tómate la presión ahora. Es el momento más importante del día."

  Scenario: Nelson registra su presión
    Given el slot de las 10:30 está visible
    When Nelson ingresa 125 en Sistólica, 82 en Diastólica, 65 en Pulso
    Then el resumen muestra "125/82 mmHg · Pulso 65 bpm"
    And el dato queda guardado en localStorage
```
