# Roadmap — Nelson Companion

## v0.1 — MVP funcional (Actual)
- ✅ Reloj sincronizado con dispositivo
- ✅ Protocolo 24 Abr – 3 May 2026
- ✅ Checklist de medicamentos con foto de pastilla
- ✅ Registro de signos vitales (PA sistólica/diastólica/pulso)
- ✅ TTS multicapa (pregrabado → API → navegador)
- ✅ Auto-aviso por tiempo
- ✅ Exportación CSV
- ✅ Alertas de emergencia siempre visibles
- ✅ GitHub Pages deployment

## v0.2 — Mejoras UX (Mayo 2026)
- ✅ Service Worker — funcionalidad offline completa
- ✅ Notificaciones push nativas (Web Push API + cron GitHub Actions)
- ✅ Audio pregrabado para todos los slots del protocolo (ElevenLabs, voz Valentina)
- ✅ Soporte SpO2 en registro de vitales
- ✅ Modo nocturno automático (detectar hora del dispositivo)
- ✅ Vibración háptica en confirmación de medicamento
- ✅ CI pipeline (Jest 78 tests + Playwright 42 tests E2E)
- ✅ Secrets management via Infisical (env-slug: dev)
- ✅ Deploy automático a GitHub Pages via GitHub Actions
- [ ] Supabase Edge Function `send-push` deployada en producción
- [ ] VAPID secrets cargados en Supabase dashboard
- [ ] Verificar push notifications end-to-end en Android

## v0.3 — Voz de alta calidad (Junio 2026)
- ✅ Integración ElevenLabs — voz Valentina (VR6AewLTigWG4xSOukaG), multilingual v2
- [ ] Panel de administración para configurar API key sin tocar código
- [ ] Grabación de audio pregrabado desde el dispositivo (cuidador graba)
- [ ] Reconocimiento de voz básico (sí/no para confirmaciones)

## v0.4 — Protocolo dinámico (Julio 2026)
- [ ] Editor visual del protocolo (sin JSON manual)
- [ ] Soporte para múltiples protocolos (semanas diferentes)
- [ ] Sincronización con Google Sheets como base de datos
- [ ] Resumen automático diario vía WhatsApp (Twilio API)

## v1.0 — Estructurador del día (Q3 2026)
- [ ] Más allá de medicación: comidas, caminata, ejercicios, descanso
- [ ] Seguimiento de humor/bienestar (iconos simples, sin texto)
- [ ] Dashboard del cuidador (Christian ve el estado de Nelson)
- [ ] Exportación PDF del historial semanal (para cardióloga en Cuenca)
- [ ] Soporte multi-idioma (español neutro vs. español de Ecuador)
