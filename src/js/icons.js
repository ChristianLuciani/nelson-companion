/**
 * icons.js — SVG inline icons (vanilla port de icons.jsx)
 * Diseñados para 80-120px en la vista paciente y 18-24px en el dashboard.
 * Uso: Icons.get('pill', 32, '#current', 2)  → string HTML
 */
const Icons = (() => {
  function get(name, size, color, stroke) {
    size   = size   || 32;
    color  = color  || 'currentColor';
    stroke = stroke || 2;
    const a = `width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" `
            + `stroke="${color}" stroke-width="${stroke}" `
            + `stroke-linecap="round" stroke-linejoin="round"`;
    switch (name) {
      case 'pill': return `<svg ${a}>
        <rect x="3" y="11" width="26" height="10" rx="5"/>
        <line x1="16" y1="11" x2="16" y2="21"/>
        <circle cx="9" cy="16" r="0.5" fill="${color}"/>
        <circle cx="11.5" cy="14" r="0.5" fill="${color}"/>
      </svg>`;
      case 'heart': return `<svg ${a}>
        <path d="M16 27s-10-6.5-10-14a6 6 0 0 1 10-4.5A6 6 0 0 1 26 13c0 7.5-10 14-10 14z"/>
        <polyline points="3,17 9,17 12,12 15,22 18,17 29,17" stroke-width="${stroke*0.85}"/>
      </svg>`;
      case 'walk': return `<svg ${a}>
        <circle cx="19" cy="5" r="3"/>
        <line x1="19" y1="8" x2="17" y2="17"/>
        <path d="M17 12 L22 15"/>
        <path d="M17 12 L12 14"/>
        <path d="M17 17 L21 22 L19 28"/>
        <path d="M17 17 L13 21 L16 28"/>
      </svg>`;
      case 'plate': return `<svg ${a}>
        <circle cx="16" cy="16" r="11"/>
        <circle cx="16" cy="16" r="7"/>
        <line x1="2" y1="28" x2="30" y2="28"/>
      </svg>`;
      case 'cup': return `<svg ${a}>
        <path d="M6 10h16v10a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V10z"/>
        <path d="M22 13h3a3 3 0 0 1 0 6h-3"/>
        <path d="M10 4c0 2 2 2 2 4M14 4c0 2 2 2 2 4M18 4c0 2 2 2 2 4"/>
      </svg>`;
      case 'sun': return `<svg ${a}>
        <circle cx="16" cy="16" r="5"/>
        <line x1="16" y1="3" x2="16" y2="6"/>
        <line x1="16" y1="26" x2="16" y2="29"/>
        <line x1="3" y1="16" x2="6" y2="16"/>
        <line x1="26" y1="16" x2="29" y2="16"/>
        <line x1="6.5" y1="6.5" x2="8.5" y2="8.5"/>
        <line x1="23.5" y1="23.5" x2="25.5" y2="25.5"/>
        <line x1="6.5" y1="25.5" x2="8.5" y2="23.5"/>
        <line x1="23.5" y1="8.5" x2="25.5" y2="6.5"/>
      </svg>`;
      case 'moon': return `<svg ${a}>
        <path d="M26 19A11 11 0 1 1 13 6a8 8 0 0 0 13 13z"/>
      </svg>`;
      case 'phone': return `<svg ${a}>
        <path d="M27 22v3a3 3 0 0 1-3.3 3 22 22 0 0 1-9.6-3.4 21 21 0 0 1-6.5-6.5A22 22 0 0 1 4.2 8.3 3 3 0 0 1 7.2 5h3a3 3 0 0 1 3 2.6c.2 1.3.5 2.5.9 3.6a3 3 0 0 1-.7 3.2L12 16a16 16 0 0 0 6 6l1.6-1.4a3 3 0 0 1 3.2-.7c1.1.4 2.3.7 3.6.9A3 3 0 0 1 27 22z"/>
      </svg>`;
      case 'check': return `<svg ${a}>
        <polyline points="6,16 13,23 26,9" stroke-width="${stroke*1.2}"/>
      </svg>`;
      case 'speaker': return `<svg ${a}>
        <polygon points="4,12 4,20 10,20 17,26 17,6 10,12"/>
        <path d="M21 11a7 7 0 0 1 0 10"/>
        <path d="M24.5 7.5a12 12 0 0 1 0 17"/>
      </svg>`;
      case 'plus': return `<svg ${a}>
        <line x1="16" y1="6" x2="16" y2="26"/>
        <line x1="6" y1="16" x2="26" y2="16"/>
      </svg>`;
      case 'minus': return `<svg ${a}>
        <line x1="6" y1="16" x2="26" y2="16"/>
      </svg>`;
      case 'arrow-left': return `<svg ${a}>
        <polyline points="14,6 4,16 14,26"/>
        <line x1="4" y1="16" x2="28" y2="16"/>
      </svg>`;
      case 'arrow-right': return `<svg ${a}>
        <line x1="4" y1="16" x2="28" y2="16"/>
        <polyline points="18,6 28,16 18,26"/>
      </svg>`;
      case 'sos': return `<svg ${a}>
        <circle cx="16" cy="16" r="12"/>
        <path d="M11 14h-3a1 1 0 0 0 0 2h2a1 1 0 0 1 0 2h-3" stroke-width="${stroke*0.8}"/>
        <circle cx="16" cy="16" r="2" stroke-width="${stroke*0.8}"/>
        <path d="M21 14h3a1 1 0 0 1 0 2h-2a1 1 0 0 0 0 2h3" stroke-width="${stroke*0.8}"/>
      </svg>`;
      case 'alert': return `<svg ${a}>
        <path d="M16 4l13 22H3L16 4z"/>
        <line x1="16" y1="13" x2="16" y2="19"/>
        <circle cx="16" cy="23" r="0.6" fill="${color}"/>
      </svg>`;
      case 'chevron-right': return `<svg ${a}><polyline points="12,6 22,16 12,26"/></svg>`;
      case 'chevron-left':  return `<svg ${a}><polyline points="20,6 10,16 20,26"/></svg>`;
      case 'note': return `<svg ${a}>
        <path d="M6 4h14l6 6v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
        <polyline points="20,4 20,10 26,10"/>
        <line x1="9" y1="16" x2="22" y2="16"/>
        <line x1="9" y1="21" x2="22" y2="21"/>
        <line x1="9" y1="26" x2="18" y2="26"/>
      </svg>`;
      case 'export': return `<svg ${a}>
        <path d="M16 4v18"/>
        <polyline points="9,11 16,4 23,11"/>
        <path d="M5 20v6a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-6"/>
      </svg>`;
      case 'settings': return `<svg ${a}>
        <circle cx="16" cy="16" r="3"/>
        <path d="M26 16l2-2-2-3-3 1-2-1-1-3h-4l-1 3-2 1-3-1-2 3 2 2-2 2 2 3 3-1 2 1 1 3h4l1-3 2-1 3 1 2-3-2-2z"/>
      </svg>`;
      case 'user': return `<svg ${a}>
        <circle cx="16" cy="11" r="5"/>
        <path d="M5 28a11 11 0 0 1 22 0"/>
      </svg>`;
      case 'doctor': return `<svg ${a}>
        <circle cx="16" cy="9" r="4"/>
        <path d="M8 28v-4a8 8 0 0 1 16 0v4"/>
        <path d="M12 19v3a4 4 0 0 0 8 0v-3"/>
      </svg>`;
      default: return `<svg ${a}></svg>`;
    }
  }

  return { get };
})();
