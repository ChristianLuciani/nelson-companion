/**
 * Tests unitarios — TTS module
 */
const TTS = require('../../src/js/tts');

// Mock Web Speech API
global.SpeechSynthesisUtterance = jest.fn().mockImplementation(text => ({
  text, lang: '', rate: 1, pitch: 1, volume: 1, onstart: null, onend: null, onerror: null
}));
global.window = {
  speechSynthesis: {
    speak: jest.fn(u => { if(u.onstart) u.onstart(); setTimeout(()=>{ if(u.onend) u.onend(); },100); }),
    cancel: jest.fn(),
    getVoices: jest.fn(() => [{ lang:'es-ES', name:'es Female', default:true }])
  }
};

describe('TTS.configure', () => {
  test('acepta configuración sin error', () => {
    expect(() => TTS.configure({ lang:'es-ES', rate:0.85 })).not.toThrow();
  });
  test('configura apiProvider', () => {
    expect(() => TTS.configure({ apiProvider:'elevenlabs', apiKey:'test', voiceId:'abc' })).not.toThrow();
    TTS.configure({ apiProvider: null }); // reset
  });
});

describe('TTS.isSpeaking', () => {
  test('devuelve false antes de hablar', () => {
    expect(TTS.isSpeaking()).toBe(false);
  });
});

describe('TTS callbacks', () => {
  test('registra onSpeakStart y onSpeakEnd sin error', () => {
    expect(() => {
      TTS.onSpeakStart(() => {});
      TTS.onSpeakEnd(() => {});
    }).not.toThrow();
  });
});
