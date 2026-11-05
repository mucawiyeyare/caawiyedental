/**
 * Theme & Color Utility for SODMAS Tenants
 * Allows each clinic to customize dashboard colors based on their logo or curated presets,
 * with real-time preview, text contrast controls, and dynamic styling across the application.
 */

/**
 * Calculates whether a color is light or dark and returns high-contrast text color
 */
export const getReadableTextColor = (hexColor = '#000000') => {
  if (!hexColor || typeof hexColor !== 'string') return '#ffffff';
  let cleanHex = hexColor.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  // Perceived brightness formula (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0f172a' : '#ffffff';
};

export const THEME_PRESETS = [
  {
    id: 'navy',
    name: 'Dental Navy',
    subtitle: 'Classic & Clinical',
    primary: '#1a56db',
    secondary: '#0b1a3d',
    accent: '#38bdf8',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #0b1a3d 0%, #0f172a 50%, #0b1a3d 100%)',
    badge: 'Standard'
  },
  {
    id: 'emerald',
    name: 'Emerald Mint',
    subtitle: 'Hygiene & Health',
    primary: '#059669',
    secondary: '#06372b',
    accent: '#34d399',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #06372b 0%, #0f172a 50%, #06372b 100%)',
    badge: 'Popular'
  },
  {
    id: 'teal',
    name: 'Teal Horizon',
    subtitle: 'Modern & Clean',
    primary: '#0891b2',
    secondary: '#0e3745',
    accent: '#22d3ee',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #0e3745 0%, #0f172a 50%, #0e3745 100%)',
    badge: 'Cosmetic'
  },
  {
    id: 'purple',
    name: 'Royal Violet',
    subtitle: 'Orthodontics & Luxury',
    primary: '#7c3aed',
    secondary: '#2e1065',
    accent: '#a78bfa',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #0f172a 50%, #2e1065 100%)',
    badge: 'Premium'
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    subtitle: 'Family & Pediatric',
    primary: '#d97706',
    secondary: '#451a03',
    accent: '#fbbf24',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #451a03 0%, #0f172a 50%, #451a03 100%)',
    badge: 'Friendly'
  },
  {
    id: 'rose',
    name: 'Ruby Aesthetic',
    subtitle: 'Dermatology & Spa',
    primary: '#e11d48',
    secondary: '#4c0519',
    accent: '#fb7185',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #4c0519 0%, #0f172a 50%, #4c0519 100%)',
    badge: 'Aesthetic'
  },
  {
    id: 'slate',
    name: 'Executive Slate',
    subtitle: 'Minimal & Tech',
    primary: '#3b82f6',
    secondary: '#0f172a',
    accent: '#94a3b8',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    badge: 'Executive'
  },
  {
    id: 'gold',
    name: 'Obsidian & Gold',
    subtitle: 'Exclusive Private Practice',
    primary: '#d97706',
    secondary: '#18181b',
    accent: '#f59e0b',
    bannerTextColor: '#ffffff',
    buttonTextColor: '#ffffff',
    gradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)',
    badge: 'Prestige'
  }
];

/**
 * Extracts dominant vibrant and deep colors from a logo image URL / base64 string.
 * Uses an offscreen HTML5 canvas to sample pixels, filter backgrounds, and cluster hues.
 */
export const extractColorsFromLogo = (imageSrc) => {
  return new Promise((resolve, reject) => {
    if (!imageSrc) {
      return reject(new Error('No logo image provided for color analysis'));
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sampleSize = 64;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        const colorCounts = {};

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          // Skip transparent pixels
          if (a < 120) continue;

          // Filter out near-white backgrounds and near-black noise
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 245 || brightness < 18) continue;

          // Calculate saturation to prefer chromatic colors over gray
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat < 0.15) continue; // skip pure washed-out grays

          // Quantize to 16-step buckets to group similar shades
          const qr = Math.round(r / 20) * 20;
          const qg = Math.round(g / 20) * 20;
          const qb = Math.round(b / 20) * 20;
          const key = `${qr},${qg},${qb}`;
          // Give higher weight to saturated, vibrant colors
          const weight = 1 + sat * 2;
          colorCounts[key] = (colorCounts[key] || 0) + weight;
        }

        const sortedKeys = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => k.split(',').map(Number));

        if (sortedKeys.length === 0) {
          // Fallback if logo was strictly monochrome / black & white
          return resolve({
            primary: '#1a56db',
            secondary: '#0b1a3d',
            accent: '#38bdf8',
            bannerTextColor: '#ffffff',
            buttonTextColor: '#ffffff',
            palette: ['#1a56db', '#0b1a3d', '#38bdf8', '#0284c7']
          });
        }

        const toHex = (n) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0');
        const rgbToHex = ([r, g, b]) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

        const palette = sortedKeys.slice(0, 6).map(rgbToHex);
        const primary = palette[0];

        // For secondary, generate a deep rich dark variant of primary
        const [pr, pg, pb] = sortedKeys[0];
        const darkR = Math.round(pr * 0.22);
        const darkG = Math.round(pg * 0.22);
        const darkB = Math.round(pb * 0.22);
        const secondary = `#${toHex(Math.max(8, darkR))}${toHex(Math.max(16, darkG))}${toHex(Math.max(35, darkB))}`;

        // For accent, generate a brighter, energetic variant
        const accentR = Math.min(255, Math.round(pr * 1.35 + 30));
        const accentG = Math.min(255, Math.round(pg * 1.35 + 30));
        const accentB = Math.min(255, Math.round(pb * 1.35 + 30));
        const accent = palette[1] && palette[1] !== primary ? palette[1] : `#${toHex(accentR)}${toHex(accentG)}${toHex(accentB)}`;

        const bannerTextColor = getReadableTextColor(secondary);
        const buttonTextColor = getReadableTextColor(primary);

        resolve({
          primary,
          secondary,
          accent,
          bannerTextColor,
          buttonTextColor,
          palette
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load logo image for color analysis'));
    img.src = imageSrc;
  });
};

/**
 * Computes live styling variables for dashboard components based on tenant branding
 */
export const getClinicTheme = (tenant = {}) => {
  const primaryColor = tenant?.primary_color || '#1a56db';
  const secondaryColor = tenant?.secondary_color || '#0b1a3d';
  const accentColor = tenant?.accent_color || '#38bdf8';
  const bannerStyle = tenant?.banner_style || 'gradient';
  const bannerTextColor = tenant?.banner_text_color || '#ffffff';
  const buttonTextColor = tenant?.button_text_color || '#ffffff';

  let bannerGradient = `linear-gradient(135deg, ${secondaryColor} 0%, #0b1120 50%, ${secondaryColor} 100%)`;
  if (bannerStyle === 'vibrant') {
    bannerGradient = `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 65%, ${secondaryColor} 100%)`;
  } else if (bannerStyle === 'solid') {
    bannerGradient = secondaryColor;
  }

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    bannerGradient,
    bannerStyle,
    bannerTextColor,
    buttonTextColor,
    glowColor: `${accentColor}25`,
    badgeBg: `${accentColor}18`,
    badgeBorder: `${accentColor}40`,
    iconBoxBg: `${primaryColor}22`,
    iconBoxBorder: `${accentColor}35`
  };
};
