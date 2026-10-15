// SignMaker's floating custom-select appearance and native-style interactions (GPL-3.0).
(() => {
  const app = window.SignalMaker;
  let sequence = 0;
  app.createNativeSelectPicker = (select, label, { colorForValue, textStyleForValue, minMenuWidth = 180 } = {}) => {
    const id = `native-select-${++sequence}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'symbolPicker dimensionInputs';
    const trigger = document.createElement('button');
    trigger.id = `${select.id}-button`;
    trigger.type = 'button';
    trigger.className = 'nativeSelectTrigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-controls', id);
    trigger.setAttribute('aria-expanded', 'false');
    const swatchMarkup = colorForValue ? '<span class="colorPickerSwatch" aria-hidden="true"></span>' : '';
    trigger.innerHTML = swatchMarkup + '<span class="symbolPickerLabel"></span><svg class="symbolPickerCaret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.25 9.25l4.75 4.75 4.75-4.75"/></svg>';
    wrapper.append(trigger);
    select.hidden = true;
    select.insertAdjacentElement('afterend', wrapper);
    const menu = document.createElement('div');
    menu.id = id;
    menu.className = 'symbolPickerMenu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', label);
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;
    document.body.append(menu);
    let open = false;
    let active = 0;
    let pointer = null;
    let pointerClick = false;
    const entries = () => [...select.options].filter(option => !option.hidden);
    function updateLabel(element, option) {
      element.textContent = option?.textContent ?? '';
      if (textStyleForValue) Object.assign(element.style, textStyleForValue(option?.value));
    }
    // SignMaker's square swatches, including its checkerboard/slash for
    // transparent colors. Keep palette colors unchanged in either theme.
    function updateSwatch(element, value) {
      if (!colorForValue) return;
      const color = colorForValue(value);
      element.style.background = color || '';
      element.classList.toggle('specialColorSwatch', !color);
    }

    function close(restoreFocus = false) {
      open = false;
      pointer = null;
      wrapper.classList.remove('open');
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      menu.inert = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (restoreFocus && trigger.isConnected && !trigger.disabled) trigger.focus({ preventScroll: true });
    }
    function position() {
      if (!open) return;
      if (!trigger.isConnected || !trigger.getClientRects().length) { close(); return; }
      const rect = trigger.getBoundingClientRect();
      const edge = 8, gap = 3;
      const width = Math.min(Math.max(rect.width, minMenuWidth), window.innerWidth - edge * 2);
      const below = Math.max(0, window.innerHeight - rect.bottom - edge - gap);
      const above = Math.max(0, rect.top - edge - gap);
      const upwards = below < Math.min(menu.scrollHeight, 200) && above > below;
      const height = Math.min(menu.scrollHeight, window.innerHeight * 0.65, upwards ? above : below);
      Object.assign(menu.style, { width: `${width}px`, maxHeight: `${height}px`,
        left: `${Math.max(edge, Math.min(rect.left, window.innerWidth - width - edge))}px`,
        top: `${upwards ? rect.top - gap - height : rect.bottom + gap}px` });
      menu.classList.toggle('opensUp', upwards);
    }
    function highlight(index) {
      const options = entries();
      active = (index + options.length) % options.length;
      const row = menu.children[active];
      if (!row) return;
      [...menu.children].forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === active));
      trigger.setAttribute('aria-activedescendant', row.id);
      if (row.offsetTop < menu.scrollTop) menu.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = row.offsetTop + row.offsetHeight - menu.clientHeight;
    }
    function sync() {
      const options = entries();
      const option = options.find(item => item.value === select.value);
      updateLabel(trigger.querySelector('.symbolPickerLabel'), option);
      if (colorForValue) updateSwatch(trigger.querySelector('.colorPickerSwatch'), select.value);
      trigger.setAttribute('aria-label', `${label}: ${option?.textContent ?? ''}`);
      trigger.disabled = select.disabled;
      if (trigger.disabled) close();
      if (open) {
        [...menu.children].forEach((row, index) => {
          updateLabel(row.querySelector('.symbolPickerLabel'), options[index]);
          const selected = options[index]?.value === select.value;
          row.classList.toggle('selected', selected);
          row.setAttribute('aria-selected', String(selected));
          row.querySelector('.symbolPickerCheck').textContent = selected ? '✓' : '';
          if (colorForValue) updateSwatch(row.querySelector('.colorPickerSwatch'), options[index]?.value);
        });
        position();
      }
    }
    function show() {
      if (trigger.disabled) return;
      const options = entries();
      menu.innerHTML = options.map((option, index) => `<button type="button" id="${id}-${index}" class="symbolPickerItem${option.value === select.value ? ' selected' : ''}" role="option" aria-selected="${option.value === select.value}" tabindex="-1" data-native-index="${index}" ${option.disabled ? 'disabled' : ''}>${swatchMarkup}<span class="symbolPickerLabel">${app.escape(option.textContent)}</span><span class="symbolPickerCheck" aria-hidden="true">${option.value === select.value ? '✓' : ''}</span></button>`).join('');
      open = true;
      wrapper.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      menu.inert = false;
      sync();
      void menu.offsetHeight;
      menu.classList.add('open');
      highlight(Math.max(0, options.findIndex(option => option.value === select.value)));
      trigger.focus({ preventScroll: true });
    }
    function choose(index) {
      const option = entries()[index];
      if (!option || option.disabled || trigger.disabled) return;
      close(true);
      if (select.value === option.value) return;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
    }
    trigger.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.pointerType === 'touch' || trigger.disabled) return;
      event.preventDefault();
      if (open) close();
      else { show(); pointer = event.pointerId; }
      pointerClick = true;
    });
    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (pointerClick && event.detail !== 0) { pointerClick = false; return; }
      pointerClick = false;
      if (open) close(); else show();
    });
    menu.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.pointerType === 'touch' || !event.target.closest('[data-native-index]')) return;
      event.preventDefault();
      pointer = event.pointerId;
    });
    menu.addEventListener('pointermove', event => {
      const row = event.target.closest('[data-native-index]');
      if (open && row && event.pointerType !== 'touch') highlight(Number(row.dataset.nativeIndex));
    });
    menu.addEventListener('click', event => {
      event.stopPropagation();
      const row = event.target.closest('[data-native-index]');
      if (open && row) choose(Number(row.dataset.nativeIndex));
    });
    const hit = event => document.elementFromPoint(event.clientX, event.clientY) || event.target;
    document.addEventListener('pointermove', event => {
      if (pointer === null || pointer !== event.pointerId) return;
      const row = hit(event)?.closest('[data-native-index]');
      if (row && menu.contains(row)) highlight(Number(row.dataset.nativeIndex));
    }, true);
    document.addEventListener('pointerup', event => {
      if (pointer === null || pointer !== event.pointerId) return;
      pointer = null;
      const target = hit(event);
      const row = target?.closest('[data-native-index]');
      if (row && menu.contains(row)) { event.preventDefault(); choose(Number(row.dataset.nativeIndex)); }
      else if (!trigger.contains(target)) close(true);
    }, true);
    document.addEventListener('pointercancel', event => {
      if (pointer === null || pointer !== event.pointerId) return;
      pointerClick = false;
      close(true);
    }, true);
    document.addEventListener('pointerdown', event => {
      if (open && !wrapper.contains(event.target) && !menu.contains(event.target)) close();
    }, true);
    trigger.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || trigger.disabled) return;
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); return; }
      if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (!open) { show(); return; }
        highlight(event.key === 'Home' ? 0 : event.key === 'End' ? entries().length - 1 : active + (event.key === 'ArrowDown' ? 1 : -1));
      } else if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (open) choose(active); else show();
      } else if (event.key.length === 1) {
        const index = entries().findIndex(option => option.textContent.toLowerCase().startsWith(event.key.toLowerCase()));
        if (index < 0) return;
        event.preventDefault();
        if (open) highlight(index); else choose(index);
      }
    });
    for (const element of select.labels ?? []) element.addEventListener('click', event => { event.preventDefault(); trigger.focus(); });
    select.addEventListener('change', sync);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    sync();
    return { sync, close };
  };
})();
