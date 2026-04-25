/**
 * tts.js — Síntesis de voz multicapa
 * Prioridad: pregrabado → API → navegador
 */
const TTS = (() => {
  let _config = null;
  let _speakStartCallback = null;
  let _speakEndCallback = null;
  let _isSpeaking = false;

  function configure(cfg) {
    _config = cfg;
  }

  function onSpeakStart(cb) {
    _speakStartCallback = cb;
  }

  function onSpeakEnd(cb) {
    _speakEndCallback = cb;
  }

  function isSpeaking() {
    return _isSpeaking || window.speechSynthesis?.speaking || false;
  }

  async function speak(text, slotId = null) {
    _isSpeaking = true;
    if (_speakStartCallback) _speakStartCallback();

    try {
      // 1. Intenta audio pregrabado
      if (slotId) {
        const audioUrl = `assets/audio/${slotId}.mp3`;
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          _isSpeaking = false;
          if (_speakEndCallback) _speakEndCallback();
        };
        audio.onerror = () => {
          // Fallback a navegador
          _speakWithBrowser(text);
        };
        audio.play();
        return;
      }
    } catch (_) {}

    // 2. Fallback a Web Speech API del navegador
    _speakWithBrowser(text);
  }

  function _speakWithBrowser(text) {
    const synth = window.speechSynthesis;
    if (!synth) {
      _isSpeaking = false;
      if (_speakEndCallback) _speakEndCallback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.onend = () => {
      _isSpeaking = false;
      if (_speakEndCallback) _speakEndCallback();
    };
    synth.cancel();
    synth.speak(utterance);
  }

  return { configure, onSpeakStart, onSpeakEnd, speak, isSpeaking };
})();

if (typeof module !== 'undefined') module.exports = TTS;
