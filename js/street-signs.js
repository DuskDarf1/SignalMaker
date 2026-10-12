// Panel palette, type choices, text metrics and formatting adapted from SignMaker v2.2 (GPL-3.0).
(() => {
  const app = window.SignalMaker;
  const palette = { Green: '#005f4d', Blue: '#00437b', Brown: '#62331e', Yellow: '#fccf34', White: '#ffffff', Black: '#000000', Purple: '#4b0082', Orange: '#ff5904', Red: '#ff0000', 'Fluorescent Pink': '#ff33cc', 'Fluorescent Yellow-Green': '#99ff00' };
  // Exact SVG paths from SignMaker v2.2 img/arrowBlocks (GPL-3.0); originals
  // retained in assets/street-arrows. Rotate only, preserving artwork proportions.
  const streetArrows = {"TYPE_D": {"width": 641.0, "height": 1044.0, "path": "M202.043,1043.75l237.768,0l4.448,-565.97l128.724,44.095c41.034,13.065 81.846,-31.886 61.828,-63.038l-314.268,-458.837l-314.655,456.427c-21.898,31.636 21.725,77.052 57.952,65.448l137.724,-42.28l0.479,564.155Z"}, "TYPE_A_EXTENDED": {"width": 3405.0, "height": 7346.0, "path": "M1294.18,2338.77l-212.466,5007.07l1243.62,0l-211.68,-5004.06l1102.61,253.101c124.65,32.272 242.847,-96.569 162.077,-219.427l-1582.64,-2330.6c-41.744,-59.945 -152.942,-60.306 -197.97,1.978l-1579.27,2334.9c-60.513,94.642 38.278,241.776 142.951,214.895l1132.77,-257.86l0,0.009Z"}};
  const fonts = ['Clearview 1', 'Clearview 2', 'Clearview 3', 'Clearview 4', 'Clearview 5WR', 'Clearview 5', 'Clearview 6', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series EM', 'Series F', 'Arial', 'Arial Bold', 'Transport', 'Modern VMS'];
  const fontFiles = {};
  for (const series of ['B', 'C', 'D', 'E', 'EM', 'F']) fontFiles[`Series ${series}`] = `Roadgeek2014Series${series}.woff2`;
  ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].forEach((word, index) => {
    for (const variant of ['B', 'W']) fontFiles[`Clearview ${index + 1}${variant}`] = `ClearviewHwy-${word}-${variant}.woff2`;
  });
  Object.assign(fontFiles, { 'Clearview 5WR': 'ClearviewHwy-Five-W-R.woff2', Transport: 'Transport.woff2', 'Modern VMS': 'VCR_OSD_MONO.ttf' });
  const uid = () => window.crypto?.randomUUID?.() ?? `street-${Date.now()}-${Math.random()}`;
  const contrast = color => ['White', 'Yellow', 'Orange', 'Fluorescent Pink', 'Fluorescent Yellow-Green'].includes(color) ? '#000000' : '#ffffff';
  const number = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  const choice = (value, choices, fallback) => choices.includes(value) ? value : fallback;
  const regulatoryById = new Map((app.regulatoryCatalog ?? []).map(entry => [entry.id, entry]));
  const regulatoryDesign = sign => sign.regulatoryImage
    ? { code: 'Custom', name: sign.regulatoryImage.name, width: sign.regulatoryImage.width, height: sign.regulatoryImage.height }
    : regulatoryById.get(sign.regulatoryCode);
  const isRegulatorySign = sign => Boolean(regulatoryDesign(sign));
  const canBlankOut = sign => !sign.regulatoryImage && Boolean(app.regulatoryBlankoutData?.[sign.regulatoryCode]);
  const isBlankOut = sign => sign.signType === 'blank-out' && canBlankOut(sign);
  const signCanMove = (sign, support) => support.type === 'mast-arm' || support.type === 'span-wire' && isRegulatorySign(sign);
  const signPositionKey = (sign, support) => support.type === 'span-wire' && isRegulatorySign(sign) ? 'spanPosition' : 'armPosition';
  const streetSignPosition = (sign, support) => sign[signPositionKey(sign, support)];
  function createStreetText() {
    return { id: uid(), textContent: 'Street Name', fontFamily: 'Series EM', fontSize: 200, lineHeight: 75,
      arrow: 'none', arrowSide: 'left', backgroundColor: 'Inherit', textColor: 'Match BG', spacing: 0, smallCapitals: false, alignment: 'Center', justification: 'Center',
      useNumeralFormatting: false, numeralFormattingSize: 120, useBannerFormatting: false, bannerFormattingSize: 100, bannerFirstLetterSize: 120 };
  }
  function createStreetSign(name = 'Street Sign 1') {
    return { id: uid(), name, mounting: 'free-swinging', spanSide: 'right', color: 'Green', corner: 'Sharp', borderRadius: 0,
      paddingTop: 0.3, paddingRight: 0.75, paddingBottom: 0.3, paddingLeft: 0.75, icon: null, iconSide: 'left',
      texts: [createStreetText()], selectedTextIndex: 0 };
  }
  function restoreStreetIcon(icon) {
    if (!icon || typeof icon.src !== 'string' || icon.src.length > 512 * 1024
      || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(icon.src)
      || !Number.isFinite(icon.width) || !Number.isFinite(icon.height)
      || icon.width < 1 || icon.height < 1 || icon.width > 1024 || icon.height > 1024) return null;
    return { src: icon.src, width: icon.width, height: icon.height,
      name: typeof icon.name === 'string' ? icon.name.slice(0, 160) : 'Uploaded icon' };
  }
  function restoreRegulatoryImage(image) {
    const artwork = restoreStreetIcon(image && { ...image, width: image.pixelWidth ?? image.width, height: image.pixelHeight ?? image.height });
    if (!artwork) return null;
    // Uploaded artwork defaults to a schematic 36-inch longest edge. The existing
    // Size slider scales both dimensions together; PNG pixels stay independent.
    const scale = 36 / Math.max(artwork.width, artwork.height);
    return { ...artwork, pixelWidth: artwork.width, pixelHeight: artwork.height,
      width: artwork.width * scale, height: artwork.height * scale };
  }
  function restoreStreetSigns(project, saved) {
    project.streetSigns = (Array.isArray(saved.streetSigns) ? saved.streetSigns : []).filter(sign => sign && typeof sign === 'object').slice(0, 100).map(raw => {
      const sign = createStreetSign(typeof raw.name === 'string' ? raw.name.slice(0, 80) : 'Street Sign');
      if (raw.regulatoryImage) {
        sign.regulatoryImage = restoreRegulatoryImage(raw.regulatoryImage);
        if (!sign.regulatoryImage) return null;
        sign.regulatoryScale = number(raw.regulatoryScale, 0.25, 4, 1);
        sign.signType = 'static';
      } else if (typeof raw.regulatoryCode === 'string') {
        if (!regulatoryById.has(raw.regulatoryCode)) return null;
        sign.regulatoryCode = raw.regulatoryCode;
        sign.regulatoryScale = number(raw.regulatoryScale, 0.25, 4, 1);
        sign.signType = raw.signType === 'blank-out' && canBlankOut(sign) ? 'blank-out' : 'static';
        sign.display = raw.display === 'off' ? 'off' : 'on';
      }
      sign.color = choice(raw.color, Object.keys(palette), 'Green');
      sign.corner = choice(raw.corner, ['Sharp', 'Round'], 'Sharp');
      sign.mounting = choice(raw.mounting, ['free-swinging', 'direct'], 'free-swinging');
      sign.spanSide = raw.spanSide === 'left' ? 'left' : 'right';
      sign.icon = restoreStreetIcon(raw.icon);
      sign.iconSide = raw.iconSide === 'right' ? 'right' : 'left';
      sign.borderRadius = number(raw.borderRadius, 0, 5, 0);
      for (const key of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) sign[key] = number(raw[key], 0, 20, sign[key]);
      if (Number.isFinite(raw.armPosition)) sign.armPosition = raw.armPosition;
      if (Number.isFinite(raw.spanPosition)) sign.spanPosition = raw.spanPosition;
      sign.texts = (Array.isArray(raw.texts) && raw.texts.length ? raw.texts : [createStreetText()]).slice(0, 50).map(value => {
        const text = createStreetText();
        if (typeof value?.textContent === 'string') text.textContent = value.textContent.slice(0, 2000);
        text.fontFamily = choice(value?.fontFamily, fonts, 'Series EM');
        text.arrow = choice(value?.arrow, ['none', ...Object.keys(streetArrows)], 'none');
        text.arrowSide = choice(value?.arrowSide, ['left', 'right'], 'left');
        text.backgroundColor = choice(value?.backgroundColor, ['Inherit', ...Object.keys(palette)], 'Inherit');
        text.textColor = choice(value?.textColor, ['Match BG', ...Object.keys(palette)], 'Match BG');
        for (const key of ['alignment', 'justification']) text[key] = choice(value?.[key], ['Left', 'Center', 'Right'], 'Center');
        for (const key of ['smallCapitals', 'useNumeralFormatting', 'useBannerFormatting']) text[key] = value?.[key] === true;
        text.fontSize = number(value?.fontSize, 50, 500, 200);
        text.lineHeight = number(value?.lineHeight, 0, 300, 75);
        text.spacing = number(value?.spacing, 0, 20, 0);
        for (const key of ['numeralFormattingSize', 'bannerFormattingSize', 'bannerFirstLetterSize']) text[key] = number(value?.[key], 50, 150, text[key]);
        return text;
      });
      sign.selectedTextIndex = number(raw.selectedTextIndex, 0, sign.texts.length - 1, 0) | 0;
      if (raw.id === saved.selectedStreetSignId) project.selectedStreetSignId = sign.id;
      return sign;
    }).filter(Boolean);
    project.selectedStreetSignId ??= project.streetSigns[0]?.id ?? null;
  }
  function streetFont(text, sign) {
    if (text.fontFamily.startsWith('Clearview ') && text.fontFamily !== 'Clearview 5WR') {
      const background = text.backgroundColor === 'Inherit' ? sign.color : text.backgroundColor;
      return text.fontFamily + (contrast(background) === '#000000' ? 'B' : 'W');
    }
    return text.fontFamily === 'Series A' ? 'Series EM' : text.fontFamily;
  }
  let canvas;
  function measure(text, size, font, smallCapitals) {
    if (typeof document !== 'undefined') {
      canvas ??= document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = `${smallCapitals ? 'small-caps ' : ''}${font === 'Arial Bold' ? 'bold ' : ''}${size}px "${font}", "Series EM"`;
      return context.measureText(text).width;
    }
    return text.length * size * 0.52;
  }
  const banners = /^(North|East|South|West|Arterial|Jct|Begin|End|Spur|Alt|Truck|Business|Bus|Byp|Loop|Express|Local|Inner|Outer|Future|Toll|City|Conn|To|Via|Turnpike|Nord|Est|Sud|Ouest)$/i;
  function textRuns(content, text, font) {
    const scale = font.startsWith('Clearview ') ? 56.90625 / 69.046875 : 1;
    const base = 10.5 * text.fontSize / 100 * scale;
    const runs = [];
    for (const token of content.split(/(\s+|\d+\S*)/).filter(Boolean)) {
      const banner = text.useBannerFormatting && banners.test(token);
      const size = base * (text.useNumeralFormatting && /^\d/.test(token) ? text.numeralFormattingSize / 100 : banner ? text.bannerFormattingSize / 100 : 1);
      const parts = banner ? [token[0], token.slice(1)] : [token];
      parts.forEach((part, index) => {
        const fontSize = size * (banner && index === 0 ? text.bannerFirstLetterSize / 100 : 1);
        runs.push({ content: part, size: fontSize, width: measure(part, fontSize, font, text.smallCapitals) });
      });
    }
    return runs;
  }
  function streetSignGeometry(sign) {
    const regulatory = regulatoryDesign(sign);
    if (regulatory) {
      const scale = number(sign.regulatoryScale, 0.25, 4, 1);
      return { width: regulatory.width * scale, height: regulatory.height * scale, regulatory };
    }
    const rows = sign.texts.map(text => {
      const font = streetFont(text, sign);
      const lines = text.textContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t').split('\n').map(line => textRuns(line, text, font));
      const baseSize = 10.5 * text.fontSize / 100;
      const lineHeight = baseSize * (text.lineHeight / 100 + 0.2);
      const artwork = streetArrows[text.arrow];
      const arrow = artwork ? { ...artwork, length: baseSize * 1.5,
        thickness: baseSize * 1.5 * artwork.width / artwork.height, gap: baseSize * 0.4 } : null;
      const arrowSpace = arrow ? arrow.length + arrow.gap : 0;
      const width = Math.max(0, ...lines.map(runs => runs.reduce((sum, run) => sum + run.width, 0))) + arrowSpace;
      const rowLineHeight = Math.max(lineHeight, arrow?.thickness ?? 0);
      return { text, font, lines, width, arrow, arrowSpace, lineHeight: rowLineHeight,
        height: Math.max(rowLineHeight, ...lines.flat().map(run => run.size * 0.7)) + rowLineHeight * (lines.length - 1) };
    });
    const border = 1.2;
    const textWidth = Math.max(12, ...rows.map(row => row.width + row.text.spacing * 12));
    const contentHeight = rows.reduce((sum, row) => sum + row.height, 0);
    const left = border + sign.paddingLeft * 6;
    const top = border + sign.paddingTop * 6;
    let icon = null;
    if (sign.icon) {
      const scale = contentHeight / Math.max(sign.icon.height, sign.icon.width / 2);
      const width = sign.icon.width * scale, height = sign.icon.height * scale;
      icon = { width, height, x: left + (sign.iconSide === 'right' ? textWidth + 4.5 : 0),
        y: top + (contentHeight - height) / 2 };
    }
    const iconSpace = icon ? icon.width + 4.5 : 0;
    const textX = left + (icon && sign.iconSide !== 'right' ? iconSpace : 0);
    const width = textWidth + iconSpace + (sign.paddingLeft + sign.paddingRight) * 6 + border * 2;
    const height = contentHeight + (sign.paddingTop + sign.paddingBottom) * 6 + border * 2;
    return { width, height, rows, border, textWidth, textX, icon };
  }
  function streetSignBounds(sign, support) {
    return app.supportPositionBounds(streetSignGeometry(sign).width, support);
  }
  function setStreetSignPosition(sign, support, value) {
    if (!sign || !signCanMove(sign, support) || !Number.isFinite(value)) return;
    const bounds = streetSignBounds(sign, support);
    sign[signPositionKey(sign, support)] = Math.max(bounds.min, Math.min(bounds.max, value));
  }
  function ensureStreetSignPositions(project) {
    (project.streetSigns ?? []).forEach((sign, index) => setStreetSignPosition(sign, project.support,
      streetSignPosition(sign, project.support) ?? Math.min(96 + index * 60, app.supportLength(project.support) / 2)));
  }
  function streetSignMarkup(sign, geometry) {
    const esc = app.escape;
    if (geometry.regulatory) {
      if (isBlankOut(sign)) {
        const { width, height } = geometry;
        return `<rect class="blankoutHousing" width="${width}" height="${height}" fill="#24272b"/><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="#000"/>`
          + (sign.display === 'off' ? '' : `<image class="regulatorySignFace blankoutFace" x="1" y="1" width="${width - 2}" height="${height - 2}" href="${app.regulatoryBlankoutData[sign.regulatoryCode]}" preserveAspectRatio="xMidYMid meet"><title>${esc(geometry.regulatory.name)}</title></image>`);
      }
      return `<image class="regulatorySignFace" width="${geometry.width}" height="${geometry.height}" href="${esc(sign.regulatoryImage?.src ?? app.regulatoryPNGData[sign.regulatoryCode])}" preserveAspectRatio="xMidYMid meet"><title>${esc(geometry.regulatory.code + ' — ' + geometry.regulatory.name)}</title></image>`;
    }
    const radius = sign.corner === 'Round' ? Math.min(sign.borderRadius * 6, geometry.height / 2, geometry.width / 2) : 0;
    const foreground = contrast(sign.color);
    let result = `<rect class="streetSignPanel" width="${geometry.width}" height="${geometry.height}" rx="${radius}" fill="${palette[sign.color]}"/>`;
    result += `<rect x="${geometry.border / 2}" y="${geometry.border / 2}" width="${geometry.width - geometry.border}" height="${geometry.height - geometry.border}" rx="${Math.max(0, radius - geometry.border / 2)}" fill="none" stroke="${foreground}" stroke-width="${geometry.border}"/>`;
    if (geometry.icon) {
      const { x, y, width, height } = geometry.icon;
      result += `<image class="streetSignIcon" x="${x}" y="${y}" width="${width}" height="${height}" href="${esc(sign.icon.src)}" preserveAspectRatio="xMidYMid meet"><title>${esc(sign.icon.name)}</title></image>`;
    }
    let y = geometry.border + sign.paddingTop * 6;
    for (const row of geometry.rows) {
      const { text, font } = row;
      const available = geometry.textWidth;
      const extra = available - row.width - text.spacing * 12;
      const start = geometry.textX + text.spacing * 6 + (text.alignment === 'Left' ? 0 : text.alignment === 'Right' ? extra : extra / 2);
      const color = text.textColor === 'Match BG' ? contrast(text.backgroundColor === 'Inherit' ? sign.color : text.backgroundColor) : palette[text.textColor];
      if (text.backgroundColor !== 'Inherit') result += `<rect x="${start}" y="${y}" width="${row.width}" height="${row.height}" fill="${palette[text.backgroundColor]}"/>`;
      row.lines.forEach((runs, index) => {
        const textWidth = runs.reduce((sum, run) => sum + run.width, 0);
        const width = textWidth + row.arrowSpace;
        let x = start + (text.justification === 'Left' ? 0 : text.justification === 'Right' ? row.width - width : (row.width - width) / 2);
        const cap = font.startsWith('Clearview ') ? 0.69046875 : font.startsWith('Series ') ? 0.5690625 : 0.7;
        const maxCap = Math.max(0, ...runs.map(run => run.size * cap));
        const baseline = y + index * row.lineHeight + (row.height - (row.lines.length - 1) * row.lineHeight + maxCap) / 2;
        if (row.arrow) {
          const arrow = row.arrow;
          const cx = x + (text.arrowSide === 'right' ? textWidth + arrow.gap : 0) + arrow.length / 2;
          const cy = y + index * row.lineHeight + (row.height - (row.lines.length - 1) * row.lineHeight) / 2;
          result += `<g class="streetTextArrow" transform="translate(${cx} ${cy}) rotate(${text.arrowSide === 'right' ? 90 : -90}) scale(${arrow.length / arrow.height}) translate(${-arrow.width / 2} ${-arrow.height / 2})" fill="${color}" fill-rule="evenodd" stroke-linejoin="round"><path d="${arrow.path}"/></g>`;
          if (text.arrowSide === 'left') x += row.arrowSpace;
        }
        for (const run of runs) {
          const family = font === 'Arial Bold' ? 'Arial' : font;
          result += `<text xml:space="preserve" x="${x}" y="${baseline}" font-family="${esc(`"${family}", "Series EM"`)}" font-size="${run.size}"${text.smallCapitals ? ' font-variant="small-caps"' : ''}${font === 'Arial Bold' ? ' font-weight="bold"' : ''} fill="${color}">${esc(run.content)}</text>`;
          x += run.width;
        }
      });
      y += row.height;
    }
    return result;
  }
  async function embedStreetSignFonts(svg, project) {
    const used = new Set((project.streetSigns ?? []).filter(sign => !isRegulatorySign(sign)).flatMap(sign => sign.texts.map(text => streetFont(text, sign))));
    const styles = [...used].filter(font => fontFiles[font]).map(font => {
      const data = app.streetFontData?.[font];
      if (!data) throw new Error('Street sign font unavailable');
      return `@font-face{font-family:"${font}";src:url(${data})}`;
    });
    return styles.length ? svg.replace(/(<svg\b[^>]*>)/, `$1<defs><style>${styles.join('')}</style></defs>`) : svg;
  }
  Object.assign(app, { streetPalette: palette, streetFonts: fonts, streetFontFiles: fontFiles, createStreetText, createStreetSign,
    regulatoryDesign, isRegulatorySign, canBlankOut, isBlankOut, signCanMove, streetSignPosition,
    restoreRegulatoryImage, restoreStreetSigns, streetFont, streetSignGeometry, streetSignBounds, setStreetSignPosition, ensureStreetSignPositions, streetSignMarkup, embedStreetSignFonts });
})();
