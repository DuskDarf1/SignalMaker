(() => {
  const app = window.SignalMaker;

  function symbol(section, cx, cy) {
    const scale = section.size / 12;
    const color = app.colors[section.color];
    if (app.isBusSymbol(section.symbol)) {
      const bus = app.dimensions.bus;
      return `<g transform="translate(${cx} ${cy}) rotate(${app.busAngles[section.symbol]}) scale(${section.size / bus.referenceDiameter})" fill="${app.colors.white}">
        <rect x="${-bus.width / 2}" y="${-bus.length / 2}" width="${bus.width}" height="${bus.length}"/>
      </g>`;
    }
    if (section.symbol === 'ball') return `<circle cx="${cx}" cy="${cy}" r="${section.size / 2}" fill="${color}"/>`;
    if (section.symbol === 'bicycle') {
      const radius = app.dimensions.bicycle.wheelOuterRadius - app.dimensions.bicycle.stroke / 2;
      return `<g transform="translate(${cx - app.dimensions.bicycle.width / 2 * scale} ${cy - app.dimensions.bicycle.height / 2 * scale}) scale(${scale})" fill="none" stroke="${color}" stroke-width="${app.dimensions.bicycle.stroke}" stroke-linejoin="round" stroke-linecap="round">
        <circle cx="1.6875" cy="3.3125" r="${radius}"/><circle cx="7.3125" cy="3.3125" r="${radius}"/>
        <path d="M1.6875 3.3125 L3.3 0.95 L4.2 3.6 Z M3.3 1.1 H6.05 L4.2 3.6 M7.3125 3.3125 Q6.55 2.9 6.05 1.1 L5.7 0.55 L5.96 0.3 L5.83 0.15625 H5.2 M2.86 0.53 L4.04 0.61 L3.3 0.79 M4.2 3.6 L4.05 4.55 H3.9 M4.2 3.6 L4.35 2.65 H4.5"/>
      </g>`;
    }
    if (section.symbol === 'u-turn') {
      const uTurn = app.dimensions.uTurn;
      return `<g transform="translate(${cx} ${cy}) scale(${section.size / uTurn.referenceDiameter})" fill="none" stroke="${color}" stroke-width="${uTurn.stroke}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4">
        <path d="${uTurn.path}"/>
      </g>`;
    }
    const arrow = app.dimensions.arrow;
    const points = app.arrowPoints().map(point => point.join(',')).join(' ');
    return `<g transform="translate(${cx} ${cy}) rotate(${app.arrowAngles[section.symbol]}) scale(${scale})" fill="${color}">
      <polygon points="${points}"/><rect x="${-arrow.stroke / 2}" y="${arrow.shaftTop}" width="${arrow.stroke}" height="${arrow.shaftBottom - arrow.shaftTop}"/>
    </g>`;
  }

  function headMarkup(head, geometry) {
    const color = app.housingColors[head.housingColor];
    let markup = '';
    if (head.backplate !== 'none') {
      const outer = app.backplatePath(head, geometry);
      markup += `<path d="${outer}" fill="#17181a"/>`;
      if (head.backplate === 'reflective') {
        markup += `<path d="${outer} ${app.backplatePath(head, geometry, head.reflectiveWidth)}" fill="#e6ee37" fill-rule="evenodd"/>`;
      }
    }
    for (const section of geometry.sections) {
      const size = section.indication.size;
      const width = section.nativeWidth;
      const height = section.nativeHeight;
      const face = section.faceWidth;
      const inset = (width - face) / 2;
      const transform = !head.cluster && !head.hawk && head.orientation === 'horizontal'
        ? `translate(${section.x} ${section.y + section.height}) rotate(-90)` : `translate(${section.x} ${section.y})`;
      markup += `<g transform="${transform}">
        <rect x="${inset}" y="0" width="${face}" height="${height}" rx="0.65" fill="${color}" stroke="#151618" stroke-width="0.12"/>
        <rect x="${inset + 0.22}" y="0.25" width="${face - 0.44}" height="${height - 0.5}" rx="0.5" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="0.1"/>`;
      for (const y of [height * 0.22, height * 0.78]) {
        markup += `<rect x="0" y="${y - 0.45}" width="${inset + 0.2}" height="0.9" rx="0.12" fill="${color}" stroke="#161719" stroke-width="0.08"/>
          <rect x="${width - inset - 0.2}" y="${y - 0.35}" width="${inset + 0.2}" height="0.7" rx="0.12" fill="#55575b"/>`;
      }
      markup += '</g>';
      markup += `<circle cx="${section.cx}" cy="${section.cy}" r="${size / 2 + 0.24}" fill="#090b0c"/>
        <circle cx="${section.cx}" cy="${section.cy}" r="${size / 2}" fill="#111719"/>`;
      markup += symbol(section.indication, section.cx, section.cy);
      const radius = size / 2 + 0.36;
      const dx = radius / Math.SQRT2;
      const y = section.cy + dx;
      markup += `<path class="signalVisor" d="M${section.cx - dx} ${y} A${radius} ${radius} 0 1 1 ${section.cx + dx} ${y}" fill="none" stroke="#0c0e10" stroke-width="0.35"/>`;
    }
    return markup;
  }

  function headScene(project) {
    if (app.hasMast(project)) {
      const mast = app.mastGeometry(project.support);
      const heads = project.heads.map(head => ({ head, geometry: app.headGeometry(head) }));
      const maxHeight = Math.max(0, ...heads.filter(item => !item.head.poleMounted).map(item => item.geometry.height));
      const alignment = app.normalizeAlignment(project.alignment);
      heads.forEach(item => {
        if (item.head.poleMounted) {
          const bounds = app.armPositionBounds(item.head, project.support);
          const height = Math.max(bounds.min, Math.min(bounds.max, item.head.poleHeight ?? 120));
          const x = item.head.poleMounting === 'direct' ? mast.poleX
            : mast.poleX + mast.poleDiameter / 2 + 6 + item.geometry.width / 2;
          item.x = (project.support.side === 'left' ? mast.width - x : x) - item.geometry.width / 2;
          item.y = app.dimensions.mast.poleHeight - height - item.geometry.height / 2;
          item.mountY = item.y + item.geometry.height / 2;
          return;
        }
        const bounds = app.armPositionBounds(item.head, project.support);
        const position = Math.max(bounds.min, Math.min(bounds.max, item.head.armPosition ?? project.support.length / 2));
        const mount = mast.armAt(position);
        item.x = (project.support.side === 'left' ? mast.width - mount.x : mount.x) - item.geometry.width / 2;
        item.mountY = mount.y;
        item.y = project.support.mastHeadAlignment === 'arm-center' ? mount.y - item.geometry.height / 2
          : mast.armY - (alignment === 'top' ? maxHeight / 2
          : alignment === 'bottom' ? item.geometry.height - maxHeight / 2 : item.geometry.height / 2);
      });
      const top = Math.min(mast.top, ...heads.map(item => item.y));
      const bottom = Math.max(mast.height, ...heads.map(item => item.y + item.geometry.height));
      mast.offsetY = -top;
      heads.forEach(item => { item.y -= top; item.mountY -= top; });
      return { heads, mast, supportStart: mast.armX, reversed: project.support.side === 'left', width: mast.width, height: bottom - top };
    }
    if (app.hasSpan(project)) {
      const span = app.spanGeometry(project.support);
      const heads = project.heads.map(head => ({ head, geometry: app.headGeometry(head) }));
      const maxHeight = Math.max(0, ...heads.map(item => item.geometry.height));
      const alignment = app.normalizeAlignment(project.alignment);
      heads.forEach(item => {
        const bounds = app.armPositionBounds(item.head, project.support);
        const position = Math.max(bounds.min, Math.min(bounds.max, item.head.armPosition ?? project.support.spanLength / 2));
        item.position = position;
        item.x = span.spanX + position - item.geometry.width / 2;
        const difference = maxHeight - item.geometry.height;
        item.y = span.lowerAt(position) + app.dimensions.span.mountGap
          + (alignment === 'top' ? 0 : alignment === 'bottom' ? difference : difference / 2);
      });
      return { heads, span, supportStart: span.spanX, reversed: false, width: span.width,
        height: Math.max(span.height, ...heads.map(item => item.y + item.geometry.height)) };
    }
    let x = 0;
    const heads = project.heads.map(head => {
      const geometry = app.headGeometry(head);
      const result = { head, geometry, x };
      x += geometry.width + project.spacing;
      return result;
    });
    const height = Math.max(1, ...heads.map(item => item.geometry.height));
    const alignment = app.normalizeAlignment(project.alignment);
    heads.forEach(item => {
      const difference = height - item.geometry.height;
      item.y = alignment === 'top' ? 0 : alignment === 'bottom' ? difference : difference / 2;
    });
    return { heads, width: Math.max(1, x - (heads.length ? project.spacing : 0)), height };
  }

  function scene(project) {
    const layout = headScene(project);
    const signs = (project.streetSigns ?? []).map(sign => ({ sign, geometry: app.streetSignGeometry(sign) }));
    const poleLevels = { left: 0, right: 0 };
    let freeX = project.heads.length ? layout.width + project.spacing : 0;
    signs.forEach(item => {
      const { sign, geometry } = item;
      if (layout.mast) {
        const mast = layout.mast;
        const bounds = app.streetSignBounds(sign, project.support);
        const position = Math.max(bounds.min, Math.min(bounds.max, sign.armPosition ?? Math.min(96, project.support.length / 2)));
        const mount = mast.armAt(position);
        const center = mount.x;
        item.x = (layout.reversed ? mast.width - center : center) - geometry.width / 2;
        item.mountY = mount.y + mast.offsetY;
        const hangers = [0.2, 0.8].map(fraction => {
          const distance = mast.positionAtX(center - mast.armX + (layout.reversed ? -1 : 1) * geometry.width * (fraction - 0.5));
          const point = mast.armAt(distance);
          const diameter = mast.armBaseDiameter + (mast.armTipDiameter - mast.armBaseDiameter) * distance / project.support.length;
          return { y: point.y + mast.offsetY, clearance: diameter / (2 * point.cos) + 12 };
        });
        item.hangerY = hangers.map(hanger => hanger.y - 4);
        item.y = sign.mounting === 'direct' ? item.mountY - geometry.height / 2
          : Math.max(...hangers.map(hanger => hanger.y + hanger.clearance));
        item.mounting = sign.mounting;
      } else if (layout.span) {
        const span = layout.span;
        if (app.isRegulatorySign(sign)) {
          const bounds = app.streetSignBounds(sign, project.support);
          const position = Math.max(bounds.min, Math.min(bounds.max, sign.spanPosition ?? project.support.spanLength / 2));
          item.x = span.spanX + position - geometry.width / 2;
          const positions = [0.2, 0.8].map(fraction => position + geometry.width * (fraction - 0.5));
          item.hangerY = positions.map(distance => span.upperAt(distance));
          item.lowerHangerY = positions.map(distance => span.lowerAt(distance));
          item.mountY = span.lowerAt(position);
          item.y = Math.max(...item.lowerHangerY) + 8;
          item.mounting = 'free-swinging';
          item.wireMounted = true;
          return;
        }
        const right = sign.spanSide !== 'left';
        item.poleX = right ? span.rightX : span.leftX;
        item.mountY = span.lowerAt(right ? project.support.spanLength : 0) + 60 + poleLevels[right ? 'right' : 'left'];
        item.x = right ? item.poleX - 12 - geometry.width : item.poleX + 12;
        item.y = item.mountY + 10;
        item.mounting = 'free-swinging';
        poleLevels[right ? 'right' : 'left'] += geometry.height + 42;
      } else {
        item.x = freeX;
        item.y = Math.max(0, (layout.height - geometry.height) / 2);
        freeX += geometry.width + project.spacing;
        item.mounting = 'none';
      }
    });
    layout.streetSigns = signs;
    if (!signs.length && !layout.mast) return layout;
    const envelopes = [...layout.heads, ...signs];
    const left = Math.min(0, ...envelopes.map(item => item.x));
    const top = Math.min(0, ...envelopes.map(item => item.y));
    const right = Math.max(layout.width, ...envelopes.map(item => item.x + item.geometry.width));
    const bottom = Math.max(layout.height, ...envelopes.map(item => item.y + item.geometry.height));
    layout.supportOffset = { x: -left, y: -top };
    [...layout.heads, ...signs].forEach(item => { item.x -= left; item.y -= top; });
    layout.heads.forEach(item => { if (item.mountY != null) item.mountY -= top; });
    signs.forEach(item => { if (item.mountY != null) item.mountY -= top; if (item.poleX != null) item.poleX -= left; });
    signs.forEach(item => { if (item.hangerY) item.hangerY = item.hangerY.map(y => y - top); });
    signs.forEach(item => { if (item.lowerHangerY) item.lowerHangerY = item.lowerHangerY.map(y => y - top); });
    layout.width = right - left;
    layout.height = bottom - top;
    if (layout.supportStart != null) layout.supportStart = layout.reversed
      ? layout.width - (layout.mast.width - layout.mast.armX - left) : layout.supportStart - left;
    return layout;
  }

  function tone(color, amount) {
    return `#${[1, 3, 5].map(offset => {
      const value = parseInt(color.slice(offset, offset + 2), 16);
      return Math.round(value + ((amount > 0 ? 255 : 0) - value) * Math.abs(amount)).toString(16).padStart(2, '0');
    }).join('')}`;
  }

  function poleMarkup(x, top, bottom, baseDiameter, topDiameter, plateWidth, color) {
    const light = tone(color, 0.2);
    const shade = tone(color, -0.3);
    const thickness = app.dimensions.mast.baseThickness;
    return `<g class="supportPost">
      <path d="M${x - topDiameter / 2} ${top} H${x + topDiameter / 2} L${x + baseDiameter / 2} ${bottom} H${x - baseDiameter / 2} Z"/>
      <path d="M${x - topDiameter / 2} ${top} H${x - topDiameter * 0.3} L${x - baseDiameter * 0.3} ${bottom} H${x - baseDiameter / 2} Z" fill="${light}"/>
      <path d="M${x + topDiameter * 0.25} ${top} H${x + topDiameter / 2} L${x + baseDiameter / 2} ${bottom} H${x + baseDiameter * 0.25} Z" fill="${shade}"/>
      <ellipse cx="${x}" cy="${top}" rx="${topDiameter / 2}" ry="${Math.min(1.5, topDiameter * 0.09)}" fill="${light}"/>
      <rect x="${x - plateWidth / 2}" y="${bottom}" width="${plateWidth}" height="${thickness}" fill="${shade}"/>
      <path d="M${x - plateWidth / 2} ${bottom} l1.5 -1.25 h${plateWidth} l-1.5 1.25 Z" fill="${light}"/>
    </g>`;
  }

  function concretePoleMarkup(x, top, bottom, baseWidth, topWidth, color) {
    const chamfer = app.dimensions.span.concreteChamfer;
    const leftTop = x - topWidth / 2;
    const rightTop = x + topWidth / 2;
    const leftBase = x - baseWidth / 2;
    const rightBase = x + baseWidth / 2;
    return `<g class="supportPost concretePost">
      <path d="M${leftTop} ${top} H${rightTop} L${rightBase} ${bottom} H${leftBase} Z"/>
      <path d="M${leftTop} ${top} H${leftTop + chamfer} L${leftBase + chamfer} ${bottom} H${leftBase} Z" fill="${tone(color, 0.15)}"/>
      <path d="M${rightTop - chamfer} ${top} H${rightTop} L${rightBase} ${bottom} H${rightBase - chamfer} Z" fill="${tone(color, -0.12)}"/>
      <path d="M${rightTop} ${top} l1.5 -1.25 L${rightBase + 1.5} ${bottom - 1.25} L${rightBase} ${bottom} Z" fill="${tone(color, -0.3)}"/>
      <path d="M${leftTop} ${top} l1.5 -1.25 H${rightTop + 1.5} l-1.5 1.25 Z" fill="${tone(color, 0.2)}"/>
    </g>`;
  }

  function bowedArmMarkup(mast, color) {
    const edge = fraction => mast.samples.map(point => [point.x + point.sin * point.diameter * fraction,
      point.y + point.cos * point.diameter * fraction]);
    const strip = (from, to) => {
      const points = [...edge(from), ...edge(to).reverse()];
      return `M${points[0].join(' ')} ${points.slice(1).map(point => `L${point.join(' ')}`).join(' ')} Z`;
    };
    const tip = mast.tip;
    return `<g class="mastArmTube mastArmBowedTube" data-bow-angle="${mast.bowAngle}">
      <path d="${strip(-0.5, 0.5)}"/>
      <path d="${strip(-0.5, -0.28)}" fill="${tone(color, 0.2)}"/>
      <path d="${strip(0.28, 0.5)}" fill="${tone(color, -0.3)}"/>
      <ellipse cx="${tip.x}" cy="${tip.y}" rx="0.75" ry="${mast.armTipDiameter / 2}" transform="rotate(${mast.bowAngle - mast.angle} ${tip.x} ${tip.y})" fill="${tone(color, -0.2)}"/>
    </g>`;
  }

  function rawSupportMarkup(project, layout) {
    const color = project.support?.color;
    if (layout.span) {
      const span = layout.span;
      const support = project.support;
      const concrete = support.spanPostMaterial === 'concrete';
      const end = span.spanX + support.spanLength;
      const wire = tone(color, -0.25);
      const lowerLeft = span.lowerAt(0);
      const lowerRight = span.lowerAt(support.spanLength);
      return `<g class="spanWire" fill="${app.escape(color)}">
        ${concrete ? concretePoleMarkup(span.leftX, span.leftTopY, span.postBottom, support.leftPostWidth, span.leftTopWidth, color)
          : poleMarkup(span.leftX, span.leftTopY, span.postBottom, support.leftPostWidth, span.leftTopWidth, span.leftBaseWidth, color)}
        ${concrete ? concretePoleMarkup(span.rightX, span.rightTopY, span.postBottom, support.rightPostWidth, span.rightTopWidth, color)
          : poleMarkup(span.rightX, span.rightTopY, span.postBottom, support.rightPostWidth, span.rightTopWidth, span.rightBaseWidth, color)}
        <g fill="none" stroke="${wire}" stroke-linecap="round">
          <path class="catenaryWire" d="M${span.spanX} ${span.upperLeftY} Q${(span.spanX + end) / 2} ${(span.upperLeftY + span.upperRightY) / 2 + 2 * span.sag} ${end} ${span.upperRightY}" stroke-width="0.75"/>
          <path d="M${span.spanX} ${span.upperLeftY - 0.25} Q${(span.spanX + end) / 2} ${(span.upperLeftY + span.upperRightY) / 2 + 2 * span.sag - 0.25} ${end} ${span.upperRightY - 0.25}" stroke="${tone(color, 0.25)}" stroke-width="0.35"/>
          <path class="messengerWire" d="M${span.spanX} ${lowerLeft} L${end} ${lowerRight}" stroke-width="1.25"/>
          <path d="M${span.spanX} ${lowerLeft - 0.3} L${end} ${lowerRight - 0.3}" stroke="${tone(color, 0.25)}" stroke-width="0.35"/>
        </g>
        ${[[span.spanX, span.upperLeftY, -1], [span.spanX, lowerLeft, -1], [end, span.upperRightY, 1], [end, lowerRight, 1]].map(([x, y, side]) =>
          concrete ? `<g class="concreteEyebolt" fill="none" stroke="${tone(color, -0.3)}" stroke-width="0.75">
            <path d="M${x + side * 1.5} ${y} H${x + side * 5}"/><circle cx="${x}" cy="${y}" r="1.5"/>
          </g>` : `<rect x="${x - 3}" y="${y - 2}" width="6" height="4" rx="1" fill="${tone(color, -0.2)}"/>`).join('')}
        ${layout.heads.map(item => {
          const x = span.spanX + item.position;
          const upper = span.upperAt(item.position);
          const lower = span.lowerAt(item.position);
          return `<g class="signalMount">
            <rect x="${x - 0.75}" y="${upper}" width="1.5" height="${item.y - upper + 2}"/>
            <rect x="${x + 0.25}" y="${upper}" width="0.5" height="${item.y - upper + 2}" fill="${tone(color, -0.3)}"/>
            <rect x="${x - 1.5}" y="${upper - 1}" width="3" height="2" rx="0.5"/>
            <rect x="${x - 2}" y="${lower - 1.5}" width="4" height="3" rx="0.5"/>
          </g>`;
        }).join('')}
      </g>`;
    }
    const mast = layout.mast;
    if (!mast) return '';
    const { poleX, poleBottom, poleTopDiameter, poleDiameter, armX, armY, armBaseDiameter, armTipDiameter, baseWidth, connectionHeight } = mast;
    const end = armX + project.support.length;
    const mirror = project.support.side === 'left' ? `translate(${mast.width} 0) scale(-1 1)` : '';
    const tube = mast.bowAngle ? bowedArmMarkup(mast, color) : `<g class="mastArmTube" transform="rotate(${-mast.angle} ${armX} ${armY})">
      <path d="M${armX} ${armY - armBaseDiameter / 2} L${end} ${armY - armTipDiameter / 2} V${armY + armTipDiameter / 2} L${armX} ${armY + armBaseDiameter / 2} Z"/>
      <path d="M${armX} ${armY - armBaseDiameter / 2} L${end} ${armY - armTipDiameter / 2} V${armY - armTipDiameter * 0.28} L${armX} ${armY - armBaseDiameter * 0.28} Z" fill="${tone(color, 0.2)}"/>
      <path d="M${armX} ${armY + armBaseDiameter * 0.28} L${end} ${armY + armTipDiameter * 0.28} V${armY + armTipDiameter / 2} L${armX} ${armY + armBaseDiameter / 2} Z" fill="${tone(color, -0.3)}"/>
      <ellipse cx="${end}" cy="${armY}" rx="0.75" ry="${armTipDiameter / 2}" fill="${tone(color, -0.2)}"/>
      </g>`;
    return `<g class="mastArm" transform="translate(0 ${mast.offsetY})" fill="${app.escape(color)}"><g transform="${mirror}">
      ${poleMarkup(poleX, 0, poleBottom, poleDiameter, poleTopDiameter, baseWidth, color)}
      <rect x="${armX - 2}" y="${armY - connectionHeight / 2}" width="2.5" height="${connectionHeight}"/>
      <rect x="${armX - 0.25}" y="${armY - connectionHeight / 2}" width="0.75" height="${connectionHeight}" fill="${tone(color, -0.3)}"/>
      ${tube}
      ${layout.heads.filter(item => item.head.poleMounted).map(item => {
        const centerY = item.y + item.geometry.height / 2 - mast.offsetY - (layout.supportOffset?.y ?? 0);
        // Direct mounting uses two bands on the pole face; side mounting adds a schematic 9-inch bracket extension.
        const extension = item.head.poleMounting === 'direct' ? 0 : 9;
        return [-1, 1].map(side => `<g class="poleSignalMount ${item.head.poleMounting === 'direct' ? 'directPoleMount' : 'sidePoleMount'}"><rect x="${poleX - poleDiameter / 2}" y="${centerY + side * item.geometry.height * 0.3 - 1}" width="${poleDiameter + extension}" height="2"/><rect x="${poleX - poleDiameter / 2}" y="${centerY + side * item.geometry.height * 0.3}" width="${poleDiameter + extension}" height="1" fill="${tone(color, -0.3)}"/></g>`).join('');
      }).join('')}
    </g></g>${(mast.angle || mast.bowAngle) && project.support.mastHeadAlignment !== 'arm-center' ? layout.heads.filter(item => !item.head.poleMounted).map(item => {
      const x = item.x + item.geometry.width / 2 - (layout.supportOffset?.x ?? 0);
      const mountY = item.mountY - (layout.supportOffset?.y ?? 0);
      const centerY = item.y + item.geometry.height / 2 - (layout.supportOffset?.y ?? 0);
      const y = Math.min(mountY, centerY);
      return `<g class="signalMount mastSignalMount" fill="${app.escape(color)}">
        <rect x="${x - 0.75}" y="${y}" width="1.5" height="${Math.abs(centerY - mountY)}"/>
        <rect x="${x + 0.25}" y="${y}" width="0.5" height="${Math.abs(centerY - mountY)}" fill="${tone(color, -0.3)}"/>
        <rect x="${x - 1.5}" y="${mountY - 1}" width="3" height="2" rx="0.5"/>
      </g>`;
    }).join('') : ''}`;
  }

  function streetMountMarkup(project, layout) {
    const color = project.support?.color ?? '#a9a9a9';
    return (layout.streetSigns ?? []).map(item => {
      if (item.mounting !== 'free-swinging') return '';
      const points = [item.x + item.geometry.width * 0.2, item.x + item.geometry.width * 0.8];
      const rail = layout.span && !item.wireMounted ? `<g class="streetCantilever" fill="none" stroke="${color}">
        <path d="M${item.poleX} ${item.mountY} H${item.poleX > item.x ? item.x : item.x + item.geometry.width}" stroke-width="2.5"/>
        <path d="M${item.poleX} ${item.mountY - 24} L${item.poleX > item.x ? item.x : item.x + item.geometry.width} ${item.mountY}" stroke-width="1.5"/>
        ${[item.mountY - 24, item.mountY].map(y => `<path d="M${item.poleX - 8} ${y} H${item.poleX + 8}" stroke-width="3"/>`).join('')}
      </g>` : '';
      return `<g class="streetSignMount" data-mount="${item.wireMounted ? 'span-hangers' : layout.span ? 'pole-cantilever' : 'mast-hangers'}" fill="${color}">${rail}${points.map((x, index) => {
        const y = item.hangerY?.[index] ?? item.mountY;
        return `<rect x="${x - 1}" y="${y}" width="2" height="${item.y - y + 0.6}"/>
          <rect x="${x + 0.3}" y="${y}" width="0.7" height="${item.y - y + 0.6}" fill="${tone(color, -0.3)}"/>
          <rect x="${x - 2}" y="${item.y - 1.5}" width="4" height="1.5" fill="${tone(color, -0.2)}"/>
          ${item.wireMounted ? [y, item.lowerHangerY[index]].map(cableY => `<rect x="${x - 2}" y="${cableY - 1}" width="4" height="2" fill="${tone(color, -0.2)}"/>`).join('') : ''}`;
      }).join('')}</g>`;
    }).join('');
  }

  function supportMarkup(project, layout) {
    const offset = layout.supportOffset ?? { x: 0, y: 0 };
    return `<g transform="translate(${offset.x} ${offset.y})">${rawSupportMarkup(project, layout)}</g>${streetMountMarkup(project, layout)}`;
  }

  function renderSVG(project) {
    const layout = scene(project);
    const padding = 2;
    const width = layout.width + padding * 2;
    const height = layout.height + padding * 2;
    const body = layout.heads.map(({ head, geometry, x, y }) => {
      const name = app.escape(app.displayName(head));
      return `<g transform="translate(${x + padding} ${y + padding})">
        <title>${name}</title>
        ${headMarkup(head, geometry)}
      </g>`;
    }).join('') + (layout.streetSigns ?? []).map(({ sign, geometry, x, y }) =>
      `<g transform="translate(${x + padding} ${y + padding})"><title>${app.escape(sign.name)}</title>${app.streetSignMarkup(sign, geometry)}</g>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 8}" height="${height * 8}" role="img" aria-label="SignalMaker signal assembly"><g transform="translate(${padding} ${padding})">${supportMarkup(project, layout)}</g>${body}</svg>`;
  }

  function renderPreview(project) {
    const layout = scene(project);
    const supported = app.hasSupport(project);
    const support = supported ? `<svg class="${layout.mast ? 'mastSupport' : 'spanSupport'}" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true">${supportMarkup(project, layout)}</svg>` : '';
    return `<div id="headContainer" class="${layout.mast ? 'mastScene' : layout.span ? 'spanScene' : layout.streetSigns?.length ? 'signScene' : ''}" data-alignment="${app.normalizeAlignment(project.alignment)}">${support}${layout.heads.map(({ head, geometry }) =>
      `<div class="previewHead" data-head-id="${head.id}" role="button" tabindex="0" draggable="true" ${supported && head.poleMounted && app.hasMast(project) ? 'aria-keyshortcuts="ArrowUp ArrowDown" title="Drag vertically on the pole; up/down arrow keys also move this head"' : supported ? 'aria-keyshortcuts="ArrowLeft ArrowRight" title="Drag along the support; left/right arrow keys also move this head"' : ''} aria-label="Edit ${app.escape(app.displayName(head))}" aria-pressed="${head.id === project.selectedId}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.width} ${geometry.height}" aria-hidden="true">${headMarkup(head, geometry)}</svg>
      </div>`).join('')}${(layout.streetSigns ?? []).map(({ sign, geometry }) =>
      `<div class="previewStreetSign${app.isRegulatorySign(sign) ? ' regulatorySign' : ''}${app.signCanMove(sign, project.support) ? ' movableSign' : ''}" data-street-sign-id="${sign.id}" role="button" tabindex="0" aria-label="Edit ${app.escape(sign.name)}${geometry.regulatory ? app.escape(' — ' + geometry.regulatory.name) : ''}" aria-pressed="${sign.id === project.selectedStreetSignId}" ${app.signCanMove(sign, project.support) ? 'aria-keyshortcuts="ArrowLeft ArrowRight" title="Drag along the support; left/right arrow keys also move this sign"' : ''}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.width} ${geometry.height}" aria-hidden="true">${app.streetSignMarkup(sign, geometry)}</svg></div>`).join('')}</div>`;
  }

  Object.assign(app, { scene, renderSVG, renderPreview });
})();
