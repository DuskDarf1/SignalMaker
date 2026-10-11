(() => {
  const app = window.SignalMaker;
  app.startHeads = ({ showEditor, positionHeads }) => {
    let raw = null;
    try { raw = localStorage.getItem('signalmaker-project-v1'); } catch {}
    const project = app.restoreProject(raw);
    app.project = project;
    const get = id => document.getElementById(id);
    const form = get('headForm');
    const stage = get('previewStage');
    const headList = get('headList');
    const indicationList = get('indicationList');
    let headDragState = null;
    let headListDragState = null;
    let indicationDragState = null;
    let touchDragState = null;
    let suppressClickUntil = 0;
    const selectedHead = () => project.heads.find(head => head.id === project.selectedId);
    const options = (values, selected) => Object.entries(values).map(([value, label]) =>
      `<option value="${value}" ${String(selected) === value ? 'selected' : ''}>${label}</option>`).join('');

    function fitPreview() {
      const container = get('headContainer');
      if (!container) { stage.style.paddingBottom = '0px'; stage.style.paddingLeft = '0px'; return; }
      if (headDragState || app.streetSignDragging) return;
      const panel = document.querySelector('.modals > .editor:not([hidden]), #headsMenu:not([hidden])');
      const obstruction = window.innerWidth <= 768 && panel
        ? Math.max(0, stage.getBoundingClientRect().bottom - panel.getBoundingClientRect().top + 12) : 0;
      const leftInset = window.innerWidth > 768 && panel?.classList.contains('editor')
        ? Math.max(0, panel.getBoundingClientRect().right - stage.getBoundingClientRect().left + 16) : 0;
      stage.style.paddingBottom = `${obstruction}px`;
      stage.style.paddingLeft = `${leftInset}px`;
      const layout = app.scene(project);
      const scale = Math.max(0.01, Math.min(4.75,
        (stage.clientWidth - leftInset - 20) / layout.width,
        (stage.clientHeight - obstruction - 20) / layout.height));
      container.style.gap = `${project.spacing * scale}px`;
      if (app.hasSupport(project) || project.streetSigns?.length) {
        container.style.width = `${layout.width * scale}px`;
        container.style.height = `${layout.height * scale}px`;
      }
      const elements = [...container.querySelectorAll('.previewHead')];
      layout.heads.forEach(({ geometry, x, y }, index) => {
        elements[index].style.width = `${geometry.width * scale}px`;
        elements[index].style.height = `${geometry.height * scale}px`;
        if (app.hasSupport(project) || project.streetSigns?.length) {
          elements[index].style.left = `${x * scale}px`;
          elements[index].style.top = `${y * scale}px`;
        }
      });
      const signs = [...container.querySelectorAll('.previewStreetSign')];
      (layout.streetSigns ?? []).forEach(({ geometry, x, y }, index) => {
        Object.assign(signs[index].style, { width: `${geometry.width * scale}px`, height: `${geometry.height * scale}px`, left: `${x * scale}px`, top: `${y * scale}px` });
      });
    }

    function updateOptions(head) {
      if (!head) return;
      get('backplateOptions').hidden = head.backplate === 'none';
      get('reflectiveOptions').hidden = head.backplate !== 'reflective';
      get('fullBackplateOptions').hidden = !head.hawk && head.indications.length !== 5;
      get('poleMountingOptions').hidden = !head.poleMounted || !app.hasMast(project);
      get('armPositionOptions').hidden = !app.hasSupport(project);
      get('armPositionLabel').textContent = head.poleMounted && app.hasMast(project) ? 'Mount Height (ft):' : app.hasSpan(project) ? 'Span Position (ft):' : 'Arm Position (ft):';
      if (app.hasSupport(project)) {
        const bounds = app.armPositionBounds(head, project.support);
        for (const id of ['armPosition', 'armPositionValue']) {
          const input = get(id);
          input.min = bounds.min / 12;
          input.max = bounds.max / 12;
          input.setAttribute('aria-label', head.poleMounted && app.hasMast(project) ? 'Head mounting height above grade in feet' : 'Head position along support in feet');
          if (document.activeElement !== input) input.value = Number(((head.poleMounted && app.hasMast(project) ? head.poleHeight : head.armPosition) / 12).toFixed(3));
        }
      }
    }

    function renderEditor(head) {
      form.hidden = !head;
      get('headEditorEmpty').hidden = Boolean(head);
      if (!head) { get('indicationList').replaceChildren(); return; }
      form.querySelectorAll('[data-head-field]').forEach(input => {
        const value = input.dataset.headField === 'layout' ? head.hawk ? 'hawk' : head.cluster ? 'cluster' : 'linear'
          : head[input.dataset.headField];
        if (input.type === 'checkbox') input.checked = value;
        else input.value = value;
      });
      get('addIndication').disabled = head.cluster || head.hawk || head.indications.length >= 5;
      get('addIndication').title = head.hawk ? 'HAWK beacons have three indications'
        : head.cluster ? 'Clusters always have five indications' : 'Up to five indications per head';
      get('headOrientation').disabled = head.cluster || head.hawk;
      const positions = head.hawk ? ['Upper left', 'Upper right', 'Bottom']
        : ['Top', 'Upper left', 'Upper right', 'Lower left', 'Lower right'];
      indicationList.innerHTML = head.indications.map((section, index) => `<fieldset class="aplArrowEditorBlock" data-indication-id="${section.id}">
        <legend>Indication ${index + 1}${head.cluster || head.hawk ? ` - ${positions[index]}` : ''}</legend>
        <div class="aplArrowListItem">
          <button id="move-${section.id}" type="button" class="aplArrowDragHandle" draggable="${!head.hawk}" ${head.hawk ? 'disabled' : ''} aria-label="Move indication ${index + 1}" aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder; arrow keys also move this indication">Move</button>
          <select id="symbol-${section.id}" data-indication-field="symbol" ${head.hawk ? 'disabled' : ''} aria-label="Indication ${index + 1} symbol">${options(app.symbols, section.symbol)}</select>
          <select id="size-${section.id}" data-indication-field="size" aria-label="Indication ${index + 1} lens size">${options({ 8: '8 in', 12: '12 in' }, section.size)}</select>
          <button type="button" class="aplArrowDeleteButton" data-indication-action="remove" ${head.cluster || head.hawk || head.indications.length === 1 ? 'disabled' : ''} aria-label="Delete indication ${index + 1}">Delete</button>
        </div>
        <div class="fieldRow"><label for="color-${section.id}">Color:</label><select id="color-${section.id}" data-indication-field="color" ${head.hawk || app.isBusSymbol(section.symbol) ? 'disabled' : ''}>${options(app.isBusSymbol(section.symbol) ? { white: 'White' } : { red: 'Red', yellow: 'Yellow', green: 'Green' }, section.color)}</select></div>
      </fieldset>`).join('');
      updateOptions(head);
    }

    function refresh(rebuildEditor = true) {
      const focusId = document.activeElement?.id;
      const scroll = form.parentElement.scrollTop;
      const listScroll = headList.scrollTop;
      app.setMastBowWidth(project.support, project.support.bowWidth);
      app.setMastBowPosition(project.support, project.support.bowPosition);
      if (app.hasSupport(project)) app.ensureArmPositions(project);
      app.ensureStreetSignPositions?.(project);
      try { localStorage.setItem('signalmaker-project-v1', JSON.stringify(project)); } catch {}
      headList.innerHTML = project.heads.length ? project.heads.map(head =>
        `<li><button id="select-${head.id}" type="button" class="headListButton${head.id === project.selectedId ? ' active' : ''}" data-select-head="${head.id}" aria-current="${head.id === project.selectedId}" draggable="${project.heads.length > 1}" aria-keyshortcuts="ArrowUp ArrowDown" title="Drag to reorder; arrow keys also move this head"><span>${app.escape(app.displayName(head))}</span></button></li>`).join('') : '<li>No heads yet.</li>';
      for (const id of ['duplicateHead', 'removeHead', 'copy', 'download']) {
        get(id).disabled = (['copy', 'download'].includes(id) ? !app.hasDrawing(project) : !project.heads.length)
          || (id === 'copy' && get(id).dataset.copying === 'true');
      }
      get('headAlignment').value = project.alignment;
      get('supportKind').value = project.support.type;
      get('mastArmOptions').hidden = !app.hasMast(project);
      document.querySelectorAll('[data-head-action="add-supplementary"]').forEach(button => { button.hidden = !app.hasMast(project); });
      get('mastHeadAlignment').value = project.support.mastHeadAlignment;
      get('headAlignmentOptions').hidden = app.hasMast(project) && project.support.mastHeadAlignment === 'arm-center';
      for (const id of ['mastArmAngle', 'mastArmAngleValue', 'mastBowAngle', 'mastBowAngleValue']) {
        if (document.activeElement !== get(id)) get(id).value = id.startsWith('mastBow') ? project.support.bowAngle : project.support.angle;
      }
      get('mastBowPositionOptions').hidden = project.support.bowAngle === 0;
      get('mastBowWidthOptions').hidden = project.support.bowAngle === 0;
      for (const id of ['mastBowWidth', 'mastBowWidthValue']) {
        const input = get(id);
        input.max = project.support.length / 12;
        if (document.activeElement !== input) input.value = Number((project.support.bowWidth / 12).toFixed(3));
      }
      const bowBounds = app.mastBowBounds(project.support);
      for (const id of ['mastBowPosition', 'mastBowPositionValue']) {
        const input = get(id);
        input.min = bowBounds.min / 12;
        input.max = bowBounds.max / 12;
        if (document.activeElement !== input) input.value = Number((project.support.bowPosition / 12).toFixed(3));
      }
      get('spanWireOptions').hidden = !app.hasSpan(project);
      get('spanPostMaterial').value = project.support.spanPostMaterial;
      get('supportColorOptions').hidden = !app.hasSupport(project);
      get('headGapOptions').hidden = app.hasSupport(project);
      get('supportHeadSpacingOptions').hidden = !app.hasSupport(project);
      const canSpace = app.canSpaceHeadsEvenly(project);
      const spacingTitle = !app.hasSupport(project) ? 'Free-standing heads already have equal gaps'
        : project.heads.length < 2 ? 'Add at least two heads'
        : canSpace ? 'Equal gaps between heads and at both ends of the support'
        : 'Lengthen the support to fit all heads';
      for (const id of ['spaceHeadsEvenly', 'spaceSupportHeadsEvenly']) {
        get(id).disabled = !canSpace;
        get(id).title = spacingTitle;
      }
      get('mastArmSide').value = project.support.side;
      for (const id of ['armLength', 'armLengthValue']) {
        if (document.activeElement !== get(id)) get(id).value = project.support.length / 12;
      }
      for (const id of ['spanLength', 'spanLengthValue']) {
        if (document.activeElement !== get(id)) get(id).value = project.support.spanLength / 12;
      }
      document.querySelectorAll('[data-support-field]').forEach(input => {
        const field = input.dataset.supportField;
        if (document.activeElement !== input) input.value = project.support[field] / (field.endsWith('Height') ? 12 : 1);
      });
      get('supportColor').value = project.support.color;
      get('headSpacing').value = project.spacing;
      if (document.activeElement !== get('headSpacingValue')) get('headSpacingValue').value = project.spacing;
      stage.innerHTML = app.hasDrawing(project) ? app.renderPreview(project)
        : '<div class="previewEmpty"><p>No signal heads yet.</p><button type="button" data-head-action="add">Add Signal Head</button></div>';
      const head = selectedHead();
      if (rebuildEditor) renderEditor(head);
      else updateOptions(head);
      app.refreshStreetSignEditor?.();
      positionHeads();
      fitPreview();
      if (focusId && document.activeElement?.id !== focusId) get(focusId)?.focus({ preventScroll: true });
      form.parentElement.scrollTop = scroll;
      headList.scrollTop = listScroll;
      app.onDrawingChanged?.();
    }

    function flashHead(id) {
      const target = [...stage.querySelectorAll('.previewHead')].find(element => element.dataset.headId === id);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const host = stage.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.className = 'flash-selection';
      Object.assign(overlay.style, { left: `${rect.left - host.left}px`, top: `${rect.top - host.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px` });
      stage.append(overlay);
      setTimeout(() => overlay.remove(), 500);
    }

    function nextHeadName() {
      let number = 1;
      while (project.heads.some(head => head.name === `Head ${number}`)) number++;
      return `Head ${number}`;
    }

    function addHead(fromMenu = false, supplementary = false) {
      const head = app.createHead(nextHeadName());
      if (supplementary) { head.poleMounted = true; head.poleHeight = 120; head.poleMounting = 'direct'; }
      app.placeNewHead(project, head);
      project.heads.push(head);
      project.selectedId = head.id;
      refresh();
      if (!fromMenu) {
        showEditor('headEditor');
        get('headTitle').focus();
      }
    }

    document.addEventListener('click', event => {
      const action = event.target.closest('[data-head-action]')?.dataset.headAction;
      if (action === 'add-supplementary' && app.hasMast(project)) return addHead(Boolean(event.target.closest('#headsMenu')), true);
      if (action === 'add') return addHead(Boolean(event.target.closest('#headsMenu')));
      if (action === 'space-evenly') {
        if (app.spaceHeadsEvenly(project)) refresh(false);
        return;
      }
      const head = selectedHead();
      if (action === 'duplicate' && head) {
        const newHead = app.createHead('');
        const copy = Object.assign(newHead, head,
          { id: newHead.id, name: nextHeadName(),
            indications: head.indications.map(section => ({ ...section, id: app.createIndication().id })) });
        app.placeNewHead(project, copy);
        project.heads.splice(project.heads.indexOf(head) + 1, 0, copy);
        project.selectedId = copy.id;
        refresh();
      } else if (action === 'remove' && head) {
        const index = project.heads.indexOf(head);
        project.heads.splice(index, 1);
        project.selectedId = project.heads[Math.min(index, project.heads.length - 1)]?.id ?? null;
        refresh();
      }
      const id = event.target.closest('[data-select-head], [data-head-id]')?.dataset;
      if (id) {
        if (Date.now() < suppressClickUntil) return;
        project.selectedId = id.selectHead ?? id.headId;
        refresh();
        if (!id.selectHead) {
          showEditor('headEditor');
          get('headTitle').focus();
        } else get(`select-${project.selectedId}`)?.focus({ preventScroll: true });
        flashHead(project.selectedId);
      }
    });
    stage.addEventListener('keydown', event => {
      const element = event.target.closest('[data-head-id]');
      if (!element) return;
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault(); element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      } else if (app.hasSupport(project) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const head = project.heads.find(head => head.id === element.dataset.headId);
        const pole = head.poleMounted && app.hasMast(project);
        if (pole ? !['ArrowUp', 'ArrowDown'].includes(event.key) : !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        const direction = pole ? (event.key === 'ArrowUp' ? 1 : -1) : (event.key === 'ArrowRight' ? 1 : -1) * (app.hasMast(project) && project.support.side === 'left' ? -1 : 1);
        app.setArmPosition(head, project.support, (pole ? head.poleHeight : head.armPosition) + direction * (event.shiftKey ? 12 : 3));
        refresh(false);
        stage.querySelector(`[data-head-id="${head.id}"]`)?.focus({ preventScroll: true });
      }
    });
    form.addEventListener('submit', event => event.preventDefault());
    get('headName').addEventListener('input', event => {
      const head = selectedHead();
      if (head) { head.name = event.target.value; refresh(false); }
    });
    form.addEventListener('change', event => {
      const head = selectedHead();
      if (!head) return;
      const input = event.target;
      let value = input.type === 'checkbox' ? input.checked : input.value;
      const field = input.dataset.headField;
      if (field) {
        if (field === 'layout') app.setHeadLayout(head, value);
        else if (field === 'orientation') head.orientation = head.cluster || head.hawk ? 'vertical' : value;
        else head[field] = ['backplateMargin', 'reflectiveWidth'].includes(field) ? Number(value) : value;
      } else if (input.dataset.indicationField) {
        if (head.hawk && input.dataset.indicationField !== 'size') return;
        const section = head.indications.find(section => section.id === input.closest('[data-indication-id]').dataset.indicationId);
        if (input.dataset.indicationField === 'symbol') app.setIndicationSymbol(section, value);
        else if (input.dataset.indicationField !== 'color' || !app.isBusSymbol(section.symbol)) {
          section[input.dataset.indicationField] = input.dataset.indicationField === 'size' ? Number(value) : value;
        }
      }
      refresh();
    });
    get('addIndication').addEventListener('click', () => {
      const head = selectedHead();
      if (!head || head.cluster || head.hawk || head.indications.length >= 5) return;
      head.indications.push(app.createIndication('green'));
      refresh();
    });
    indicationList.addEventListener('click', event => {
      const action = event.target.closest('[data-indication-action]')?.dataset.indicationAction;
      if (!action) return;
      const head = selectedHead();
      const index = head.indications.findIndex(section => section.id === event.target.closest('[data-indication-id]').dataset.indicationId);
      if (action === 'remove' && !head.cluster && !head.hawk && head.indications.length > 1) head.indications.splice(index, 1);
      refresh();
    });

    function dropPosition(elements, clientX, clientY, vertical = false) {
      const pointer = vertical ? clientY : clientX;
      for (let index = 0; index < elements.length; index++) {
        const rect = elements[index].getBoundingClientRect();
        const midpoint = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
        if (pointer < midpoint) return { index, target: elements[index], placement: 'before' };
      }
      return { index: elements.length, target: elements.at(-1), placement: 'after' };
    }

    function markDrop(elements, clientX, clientY, vertical = false) {
      elements.forEach(element => element.classList.remove('dropBefore', 'dropAfter', 'dragOver'));
      const drop = dropPosition(elements, clientX, clientY, vertical);
      if (drop.target && drop.target.dataset.dragging !== 'true') {
        drop.target.classList.add(drop.placement === 'before' ? 'dropBefore' : 'dropAfter');
        if (vertical) drop.target.classList.add('dragOver');
      }
      return drop.index;
    }

    function beginHeadDrag(element, clientX, clientY) {
      const rect = element.getBoundingClientRect();
      headDragState = { fromIndex: project.heads.findIndex(head => head.id === element.dataset.headId),
        offsetY: clientY - rect.top - rect.height / 2, offsetX: clientX - rect.left - rect.width / 2 };
      stage.querySelectorAll('.flash-selection').forEach(overlay => overlay.remove());
      stage.querySelectorAll('.previewHead').forEach(head => {
        head.classList.add('panelWiggle');
        head.style.setProperty('--wiggle-delay', `${Math.random() * 0.12}s`);
      });
      element.classList.add('dragging');
      element.dataset.dragging = 'true';
    }

    function endHeadDrag() {
      stage.querySelectorAll('.previewHead').forEach(head => {
        head.classList.remove('panelWiggle', 'dragging', 'dropBefore', 'dropAfter');
        head.style.removeProperty('--wiggle-delay');
        delete head.dataset.dragging;
      });
      headDragState = null;
    }

    function beginHeadListDrag(element) {
      headListDragState = { fromIndex: project.heads.findIndex(head => head.id === element.dataset.selectHead) };
      headList.querySelectorAll('.headListButton').forEach(button => {
        button.classList.add('panelWiggle');
        button.style.setProperty('--wiggle-delay', `${Math.random() * 0.12}s`);
      });
      element.classList.add('dragging');
      element.dataset.dragging = 'true';
    }

    function endHeadListDrag() {
      headList.querySelectorAll('.headListButton').forEach(button => {
        button.classList.remove('panelWiggle', 'dragging', 'dropBefore', 'dropAfter', 'dragOver');
        button.style.removeProperty('--wiggle-delay');
        delete button.dataset.dragging;
      });
      headListDragState = null;
    }

    function scrollHeadList(clientY) {
      const rect = headList.getBoundingClientRect();
      if (clientY < rect.top + 20) headList.scrollTop -= 12;
      else if (clientY > rect.bottom - 20) headList.scrollTop += 12;
    }

    function beginIndicationDrag(element) {
      const head = selectedHead();
      indicationDragState = { headId: head.id,
        fromIndex: head.indications.findIndex(section => section.id === element.dataset.indicationId) };
      element.dataset.dragging = 'true';
      element.querySelector('.aplArrowListItem').classList.add('dragging');
    }

    function endIndicationDrag() {
      indicationList.querySelectorAll('.aplArrowEditorBlock').forEach(row => {
        row.classList.remove('dropBefore', 'dropAfter', 'dragOver');
        row.querySelector('.aplArrowListItem').classList.remove('dragging');
        delete row.dataset.dragging;
      });
      indicationDragState = null;
    }

    function finishDrop(kind, clientX, clientY) {
      if (kind === 'head' && headDragState) {
        if (app.hasSupport(project)) {
          const container = get('headContainer');
          const layout = app.scene(project);
          const rect = container.getBoundingClientRect();
          const scale = rect.width / layout.width;
          const x = (clientX - rect.left - headDragState.offsetX) / scale;
          const head = project.heads[headDragState.fromIndex];
          const position = head.poleMounted && app.hasMast(project)
            ? app.dimensions.mast.poleHeight + layout.mast.offsetY + (layout.supportOffset?.y ?? 0) - (clientY - rect.top - headDragState.offsetY) / scale
            : app.supportPositionAtX(project.support, (layout.reversed ? layout.width - x : x) - layout.supportStart);
          app.setArmPosition(project.heads[headDragState.fromIndex], project.support, Math.round(position / 3) * 3);
        } else {
          const elements = [...stage.querySelectorAll('.previewHead')];
          app.moveItem(project.heads, headDragState.fromIndex, dropPosition(elements, clientX, clientY).index);
        }
      } else if (kind === 'headList' && headListDragState) {
        const buttons = [...headList.querySelectorAll('.headListButton')];
        app.moveItem(project.heads, headListDragState.fromIndex, dropPosition(buttons, clientX, clientY, true).index);
      } else if (kind === 'indication' && indicationDragState) {
        const head = selectedHead();
        if (head?.id === indicationDragState.headId && !head.hawk) {
          const rows = [...indicationList.querySelectorAll('.aplArrowEditorBlock')];
          app.moveItem(head.indications, indicationDragState.fromIndex, dropPosition(rows, clientX, clientY, true).index);
        }
      }
      endHeadDrag();
      endHeadListDrag();
      endIndicationDrag();
      suppressClickUntil = Date.now() + 250;
      refresh();
    }

    stage.addEventListener('dragstart', event => {
      const element = event.target.closest('.previewHead');
      if (!element) return;
      beginHeadDrag(element, event.clientX, event.clientY);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(headDragState.fromIndex));
    });
    stage.addEventListener('dragover', event => {
      if (!headDragState) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (!app.hasSupport(project)) markDrop([...stage.querySelectorAll('.previewHead')], event.clientX, event.clientY);
    });
    stage.addEventListener('drop', event => {
      if (!headDragState) return;
      event.preventDefault();
      finishDrop('head', event.clientX, event.clientY);
    });
    stage.addEventListener('dragleave', event => {
      if (!stage.contains(event.relatedTarget)) stage.querySelectorAll('.previewHead')
        .forEach(head => head.classList.remove('dropBefore', 'dropAfter'));
    });
    stage.addEventListener('dragend', () => { endHeadDrag(); fitPreview(); });

    headList.addEventListener('dragstart', event => {
      const button = event.target.closest('.headListButton');
      if (!button || project.heads.length < 2) return;
      beginHeadListDrag(button);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(headListDragState.fromIndex));
    });
    headList.addEventListener('dragover', event => {
      if (!headListDragState) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      scrollHeadList(event.clientY);
      markDrop([...headList.querySelectorAll('.headListButton')], event.clientX, event.clientY, true);
    });
    headList.addEventListener('drop', event => {
      if (!headListDragState) return;
      event.preventDefault();
      finishDrop('headList', event.clientX, event.clientY);
    });
    headList.addEventListener('dragleave', event => {
      if (!headList.contains(event.relatedTarget)) headList.querySelectorAll('.headListButton')
        .forEach(button => button.classList.remove('dropBefore', 'dropAfter', 'dragOver'));
    });
    headList.addEventListener('dragend', () => {
      suppressClickUntil = Date.now() + 250;
      endHeadListDrag();
    });
    headList.addEventListener('keydown', event => {
      const button = event.target.closest('.headListButton');
      if (!button || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const index = project.heads.findIndex(head => head.id === button.dataset.selectHead);
      app.moveItem(project.heads, index, event.key === 'ArrowUp' ? index - 1 : index + 2);
      refresh();
    });

    indicationList.addEventListener('dragstart', event => {
      const handle = event.target.closest('.aplArrowDragHandle');
      if (!handle || handle.disabled) return;
      beginIndicationDrag(handle.closest('.aplArrowEditorBlock'));
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(indicationDragState.fromIndex));
    });
    indicationList.addEventListener('dragover', event => {
      if (!indicationDragState) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      markDrop([...indicationList.querySelectorAll('.aplArrowEditorBlock')], event.clientX, event.clientY, true);
    });
    indicationList.addEventListener('drop', event => {
      if (!indicationDragState) return;
      event.preventDefault();
      finishDrop('indication', event.clientX, event.clientY);
    });
    indicationList.addEventListener('dragleave', event => {
      if (!indicationList.contains(event.relatedTarget)) indicationList.querySelectorAll('.aplArrowEditorBlock')
        .forEach(row => row.classList.remove('dropBefore', 'dropAfter', 'dragOver'));
    });
    indicationList.addEventListener('dragend', endIndicationDrag);
    indicationList.addEventListener('keydown', event => {
      const handle = event.target.closest('.aplArrowDragHandle');
      if (!handle || handle.disabled || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const head = selectedHead();
      const index = head.indications.findIndex(section => section.id === handle.closest('[data-indication-id]').dataset.indicationId);
      app.moveItem(head.indications, index, event.key === 'ArrowUp' ? index - 1 : index + 2);
      refresh();
    });

    for (const container of [stage, headList, indicationList]) container.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0 || touchDragState) return;
      const element = container === stage ? event.target.closest('.previewHead')
        : container === headList ? event.target.closest('.headListButton')
        : event.target.closest('.aplArrowDragHandle')?.closest('.aplArrowEditorBlock');
      if (!element || (container === headList && project.heads.length < 2)
        || (container === indicationList && selectedHead()?.hawk)) return;
      touchDragState = { kind: container === stage ? 'head' : container === headList ? 'headList' : 'indication', element, container,
        pointerId: event.pointerId, x: event.clientX, y: event.clientY, ghost: null };
      container.setPointerCapture(event.pointerId);
    });
    document.addEventListener('pointermove', event => {
      const drag = touchDragState;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.ghost && Math.hypot(dx, dy) < 6) return;
      event.preventDefault();
      if (!drag.ghost) {
        const rect = drag.element.getBoundingClientRect();
        drag.left = rect.left;
        drag.top = rect.top;
        drag.ghost = drag.element.cloneNode(true);
        drag.ghost.removeAttribute('id');
        drag.ghost.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        drag.ghost.className = drag.kind === 'headList' ? 'dragGhost headListButton' : 'dragGhost';
        drag.ghost.inert = true;
        drag.ghost.setAttribute('aria-hidden', 'true');
        Object.assign(drag.ghost.style, { width: `${rect.width}px`, height: `${rect.height}px` });
        document.body.append(drag.ghost);
        if (drag.kind === 'head') beginHeadDrag(drag.element, drag.x, drag.y);
        else if (drag.kind === 'headList') beginHeadListDrag(drag.element);
        else beginIndicationDrag(drag.element);
      }
      drag.ghost.style.left = `${drag.left + dx}px`;
      drag.ghost.style.top = `${drag.top + (drag.kind === 'head' && app.hasSupport(project) ? 0 : dy)}px`;
      const elements = drag.kind === 'head' ? [...stage.querySelectorAll('.previewHead')]
        : drag.kind === 'headList' ? [...headList.querySelectorAll('.headListButton')]
        : [...indicationList.querySelectorAll('.aplArrowEditorBlock')];
      if (drag.kind === 'headList') scrollHeadList(event.clientY);
      if (drag.kind !== 'head' || !app.hasSupport(project)) markDrop(elements, event.clientX, event.clientY, drag.kind !== 'head');
      if (drag.kind === 'indication') {
        const content = form.parentElement;
        const rect = content.getBoundingClientRect();
        if (event.clientY < rect.top + 30) content.scrollTop -= 12;
        if (event.clientY > rect.bottom - 30) content.scrollTop += 12;
      }
    }, { passive: false });
    function endTouchDrag(event, cancelled = false) {
      const drag = touchDragState;
      if (!drag || drag.pointerId !== event.pointerId) return;
      touchDragState = null;
      if (drag.container.hasPointerCapture(event.pointerId)) drag.container.releasePointerCapture(event.pointerId);
      if (!drag.ghost) return;
      drag.ghost.remove();
      suppressClickUntil = Date.now() + 250;
      if (!cancelled) finishDrop(drag.kind, event.clientX, event.clientY);
      else { endHeadDrag(); endHeadListDrag(); endIndicationDrag(); fitPreview(); }
    }
    document.addEventListener('pointerup', event => endTouchDrag(event));
    document.addEventListener('pointercancel', event => endTouchDrag(event, true));
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (touchDragState) endTouchDrag({ pointerId: touchDragState.pointerId }, true);
      endHeadDrag();
      endHeadListDrag();
      endIndicationDrag();
    });
    get('headAlignment').addEventListener('change', event => {
      project.alignment = app.normalizeAlignment(event.target.value);
      refresh(false);
    });
    get('supportKind').addEventListener('change', event => {
      project.support.type = event.target.value;
      refresh();
    });
    get('mastArmSide').addEventListener('change', event => {
      project.support.side = event.target.value;
      refresh(false);
    });
    get('mastHeadAlignment').addEventListener('change', event => {
      project.support.mastHeadAlignment = event.target.value;
      refresh(false);
    });
    for (const id of ['mastArmAngle', 'mastArmAngleValue', 'mastBowAngle', 'mastBowAngleValue']) {
      const input = get(id);
      const bow = id.startsWith('mastBow');
      input.addEventListener('input', () => {
        if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
        project.support[bow ? 'bowAngle' : 'angle'] = bow ? app.normalizeMastBowAngle(input.valueAsNumber) : app.normalizeMastAngle(input.valueAsNumber);
        refresh(false);
      });
      input.addEventListener('change', () => { input.value = project.support[bow ? 'bowAngle' : 'angle']; });
    }
    for (const id of ['mastBowPosition', 'mastBowPositionValue']) {
      const input = get(id);
      input.addEventListener('input', () => {
        if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
        app.setMastBowPosition(project.support, input.valueAsNumber * 12);
        refresh(false);
      });
      input.addEventListener('change', () => { input.value = Number((project.support.bowPosition / 12).toFixed(3)); });
    }
    for (const id of ['mastBowWidth', 'mastBowWidthValue']) {
      const input = get(id);
      input.addEventListener('input', () => {
        if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
        app.setMastBowWidth(project.support, input.valueAsNumber * 12);
        refresh(false);
      });
      input.addEventListener('change', () => { input.value = Number((project.support.bowWidth / 12).toFixed(3)); });
    }
    get('spanPostMaterial').addEventListener('change', event => {
      project.support.spanPostMaterial = event.target.value;
      refresh(false);
    });
    document.querySelectorAll('[data-support-field]').forEach(input => {
      const field = input.dataset.supportField;
      const units = field.endsWith('Height') ? 12 : 1;
      input.addEventListener('input', () => {
        if (input.value === '' || !input.validity.valid) return;
        project.support[field] = input.valueAsNumber * units;
        refresh(false);
      });
      input.addEventListener('change', () => { input.value = project.support[field] / units; });
    });
    get('supportColor').addEventListener('change', event => {
      project.support.color = event.target.value;
      refresh(false);
    });
    for (const id of ['armLength', 'armLengthValue', 'spanLength', 'spanLengthValue', 'armPosition', 'armPositionValue']) {
      get(id).addEventListener('input', event => {
        const input = event.target;
        if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
        if (id.startsWith('armLength') || id.startsWith('spanLength')) {
          if (!input.validity.valid) return;
          project.support[id.startsWith('armLength') ? 'length' : 'spanLength'] = input.valueAsNumber * 12;
        } else {
          const head = selectedHead();
          if (!head || !app.hasSupport(project)) return;
          app.setArmPosition(head, project.support, input.valueAsNumber * 12);
        }
        refresh(false);
      });
      get(id).addEventListener('change', () => {
        const head = selectedHead();
        get(id).value = id.startsWith('armLength') ? project.support.length / 12
          : id.startsWith('spanLength') ? project.support.spanLength / 12
          : head ? Number(((head.poleMounted && app.hasMast(project) ? head.poleHeight : head.armPosition) / 12).toFixed(3)) : '';
      });
    }
    for (const id of ['headSpacing', 'headSpacingValue']) {
      get(id).addEventListener('input', event => {
        if (event.target.value === '' || !event.target.validity.valid) return;
        project.spacing = Number(event.target.value);
        refresh(false);
      });
      get(id).addEventListener('change', event => { event.target.value = project.spacing; });
    }
    app.fitPreview = fitPreview;
    app.refresh = refresh;
    const resizeObserver = new ResizeObserver(fitPreview);
    resizeObserver.observe(stage);
    resizeObserver.observe(document.querySelector('.modals'));
    refresh();
    return project;
  };
})();
