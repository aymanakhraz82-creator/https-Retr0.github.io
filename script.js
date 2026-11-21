/* ==========================================================================
   InvoiceKit — invoice generator logic
   Vanilla JavaScript, no dependencies. All data stays in the browser.
   ========================================================================== */
(function () {
  'use strict';

  /* Keep the footer year current on every page. */
  var yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  var form = document.getElementById('invoice-form');
  if (!form) { return; }

  var STORAGE_KEY = 'invoicekit:draft:v1';
  var $ = function (id) { return document.getElementById(id); };

  var els = {
    business: $('business-name'),
    client: $('client-name'),
    number: $('invoice-number'),
    issue: $('issue-date'),
    due: $('due-date'),
    currency: $('currency'),
    tax: $('tax-rate'),
    discount: $('discount'),
    notes: $('notes'),
    discountCurrency: $('discount-currency'),
    items: $('items'),
    template: $('item-template'),
    logoInput: $('logo-input'),
    logoThumb: $('logo-thumb'),
    removeLogo: $('remove-logo'),
    saveStatus: $('save-status'),
    addItem: $('add-item'),
    download: $('download-pdf'),
    print: $('print-invoice'),
    reset: $('reset-form')
  };

  var preview = {
    business: $('preview-business'),
    client: $('preview-client'),
    number: $('preview-number'),
    issue: $('preview-issue'),
    due: $('preview-due'),
    items: $('preview-items'),
    subtotal: $('preview-subtotal'),
    discountRow: $('preview-discount-row'),
    discount: $('preview-discount'),
    taxLabel: $('preview-tax-label'),
    tax: $('preview-tax'),
    total: $('preview-total'),
    totalTop: $('preview-total-top'),
    notes: $('preview-notes'),
    notesWrap: $('preview-notes-wrap'),
    logo: $('invoice-logo'),
    logoWrap: $('invoice-logo-wrap')
  };

  var logoSrc = '';
  var saveTimer = null;
  var formatters = {};

  /* ------------------------------------------------------------- Helpers */

  function pad2(value) { return String(value).padStart(2, '0'); }

  function toISODate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function addDays(date, days) {
    var copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function defaultInvoiceNumber() {
    return 'INV-' + new Date().getFullYear() + '-0001';
  }

  function moneyFormatter(currency) {
    if (!formatters[currency]) {
      try {
        formatters[currency] = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency
        });
      } catch (err) {
        formatters[currency] = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        });
      }
    }
    return formatters[currency];
  }

  function formatMoney(amount, currency) {
    var value = isFinite(amount) ? amount : 0;
    return moneyFormatter(currency).format(value);
  }

  function formatDate(value) {
    if (!value) { return '—'; }
    var date = new Date(value + 'T00:00:00');
    if (isNaN(date.getTime())) { return value; }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function parseNumber(value) {
    var parsed = parseFloat(value);
    return isFinite(parsed) ? parsed : 0;
  }

  function clampDiscount(value, subtotal) {
    if (value < 0) { return 0; }
    return value > subtotal ? subtotal : value;
  }

  /* ---------------------------------------------------------- Line items */

  function addItemRow(item) {
    var fragment = els.template.content.cloneNode(true);
    var row = fragment.querySelector('.item-row');

    row.querySelector('.item-description').value = (item && item.description) || '';
    row.querySelector('.item-qty').value =
      item && item.qty !== undefined && item.qty !== null && item.qty !== '' ? item.qty : 1;
    row.querySelector('.item-rate').value =
      item && item.rate !== undefined && item.rate !== null ? item.rate : '';

    els.items.appendChild(fragment);
    return els.items.lastElementChild;
  }

  function readItems() {
    return Array.prototype.map.call(
      els.items.querySelectorAll('.item-row'),
      function (row) {
        return {
          description: row.querySelector('.item-description').value.trim(),
          qty: parseNumber(row.querySelector('.item-qty').value),
          rate: parseNumber(row.querySelector('.item-rate').value)
        };
      }
    );
  }

  function refreshItemTotals(currency) {
    Array.prototype.forEach.call(els.items.querySelectorAll('.item-row'), function (row) {
      var qty = parseNumber(row.querySelector('.item-qty').value);
      var rate = parseNumber(row.querySelector('.item-rate').value);
      var cell = row.querySelector('[data-total]');
      if (cell) {
        cell.textContent = formatMoney(qty * rate, currency);
      }
    });
  }

  /* -------------------------------------------------------------- Render */

  function render() {
    var currency = els.currency.value || 'USD';
    var items = readItems();

    refreshItemTotals(currency);

    var subtotal = 0;
    items.forEach(function (item) {
      subtotal += item.qty * item.rate;
    });

    var discount = clampDiscount(parseNumber(els.discount.value), subtotal);
    var taxRate = Math.min(Math.max(parseNumber(els.tax.value), 0), 100);
    var taxable = subtotal - discount;
    var tax = taxable * (taxRate / 100);
    var total = taxable + tax;

    /* Business, client and invoice meta */
    preview.business.textContent = els.business.value.trim() || 'Your Business';
    preview.client.textContent = els.client.value.trim() || 'Client name';
    preview.number.textContent = els.number.value.trim() || 'INV-0001';
    preview.issue.textContent = formatDate(els.issue.value);
    preview.due.textContent = formatDate(els.due.value);

    /* Items table */
    while (preview.items.firstChild) {
      preview.items.removeChild(preview.items.firstChild);
    }

    var visibleItems = items.filter(function (item) {
      return item.description !== '' || item.rate !== 0;
    });

    if (visibleItems.length === 0) {
      var emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 4;
      emptyCell.textContent = 'No line items yet — add one on the left.';
      emptyRow.appendChild(emptyCell);
      preview.items.appendChild(emptyRow);
    } else {
      visibleItems.forEach(function (item) {
        var row = document.createElement('tr');

        var descriptionCell = document.createElement('td');
        descriptionCell.textContent = item.description || 'Item';
        row.appendChild(descriptionCell);

        var qtyCell = document.createElement('td');
        qtyCell.className = 'num';
        qtyCell.textContent = String(item.qty);
        row.appendChild(qtyCell);

        var rateCell = document.createElement('td');
        rateCell.className = 'num';
        rateCell.textContent = formatMoney(item.rate, currency);
        row.appendChild(rateCell);

        var amountCell = document.createElement('td');
        amountCell.className = 'num';
        amountCell.textContent = formatMoney(item.qty * item.rate, currency);
        row.appendChild(amountCell);

        preview.items.appendChild(row);
      });
    }

    /* Totals */
    preview.subtotal.textContent = formatMoney(subtotal, currency);
    preview.discount.textContent = '-' + formatMoney(discount, currency);
    preview.discountRow.hidden = discount <= 0;
    preview.taxLabel.textContent = taxRate > 0 ? 'Tax (' + taxRate + '%)' : 'Tax';
    preview.tax.textContent = formatMoney(tax, currency);
    preview.total.textContent = formatMoney(total, currency);
    preview.totalTop.textContent = formatMoney(total, currency);

    /* Notes */
    var notes = els.notes.value.trim();
    preview.notes.textContent = notes;
    preview.notesWrap.hidden = notes === '';

    /* Currency label next to the discount field */
    if (els.discountCurrency) {
      els.discountCurrency.textContent = currency;
    }
  }

  function renderLogo() {
    if (logoSrc) {
      els.logoThumb.textContent = '';
      var img = document.createElement('img');
      img.src = logoSrc;
      img.alt = '';
      els.logoThumb.appendChild(img);
      els.removeLogo.hidden = false;
      preview.logo.src = logoSrc;
      preview.logoWrap.hidden = false;
    } else {
      els.logoThumb.textContent = 'Logo';
      els.removeLogo.hidden = true;
      preview.logo.removeAttribute('src');
      preview.logoWrap.hidden = true;
    }
  }

  /* ------------------------------------------------------ Local storage */

  function collect() {
    return {
      v: 1,
      business: els.business.value,
      client: els.client.value,
      number: els.number.value,
      issue: els.issue.value,
      due: els.due.value,
      currency: els.currency.value,
      tax: els.tax.value,
      discount: els.discount.value,
      notes: els.notes.value,
      logo: logoSrc,
      items: readItems()
    };
  }

  function saveNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collect()));
      if (els.saveStatus) {
        els.saveStatus.textContent = 'Draft saved in this browser.';
      }
    } catch (err) {
      if (els.saveStatus) {
        els.saveStatus.textContent = 'Could not save locally — storage may be full or blocked.';
      }
    }
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 350);
  }

  function restore() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return false;
    }
    if (!raw) { return false; }

    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return false;
    }
    if (!data || typeof data !== 'object') { return false; }

    els.business.value = typeof data.business === 'string' ? data.business : '';
    els.client.value = typeof data.client === 'string' ? data.client : '';
    els.number.value = typeof data.number === 'string' ? data.number : '';
    els.issue.value = typeof data.issue === 'string' ? data.issue : '';
    els.due.value = typeof data.due === 'string' ? data.due : '';
    els.notes.value = typeof data.notes === 'string' ? data.notes : '';

    if (typeof data.currency === 'string' && /^[A-Z]{3}$/.test(data.currency)) {
      var currencyOption = els.currency.querySelector('option[value="' + data.currency + '"]');
      if (currencyOption) { els.currency.value = data.currency; }
    }
    if (data.tax !== undefined && data.tax !== null && data.tax !== '') {
      els.tax.value = String(data.tax);
    }
    if (data.discount !== undefined && data.discount !== null && data.discount !== '') {
      els.discount.value = String(data.discount);
    }
    if (typeof data.logo === 'string' && data.logo.indexOf('data:image/') === 0) {
      logoSrc = data.logo;
    }
    if (Array.isArray(data.items) && data.items.length) {
      data.items.forEach(function (item) {
        addItemRow({
          description: typeof item.description === 'string' ? item.description : '',
          qty: item.qty,
          rate: item.rate
        });
      });
    }
    return true;
  }

  /* ------------------------------------------------------------- Images */

  function resizeImage(file, maxSize) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          var width = Math.max(1, Math.round(img.width * scale));
          var height = Math.max(1, Math.round(img.height * scale));

          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          var ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas is not available.'));
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = function () { reject(new Error('Image could not be read.')); };
        img.src = String(reader.result);
      };

      reader.onerror = function () { reject(new Error('File could not be read.')); };
      reader.readAsDataURL(file);
    });
  }

  /* --------------------------------------------------------------- PDF */

  function downloadPdf() {
    if (typeof window.html2pdf !== 'function') {
      window.alert('The PDF tool is still loading. Check your connection and try again in a moment.');
      return;
    }

    var invoice = $('invoice');
    if (!invoice) { return; }

    var fileName = (els.number.value.trim() || 'invoice').replace(/[^\w.\-]+/g, '-');
    var originalLabel = els.download.textContent;

    function finish() {
      invoice.classList.remove('pdf-export');
      els.download.disabled = false;
      els.download.textContent = originalLabel;
    }

    invoice.classList.add('pdf-export');

    els.download.disabled = true;
    els.download.textContent = 'Preparing PDF…';

    window.html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: fileName + '.pdf',
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] }
      })
      .from(invoice)
      .save()
      .then(finish, function (err) {
        console.error(err);
        window.alert('Sorry, the PDF could not be created. You can use Print and choose “Save as PDF” instead.');
        finish();
      });
  }

  /* ------------------------------------------------------------- Events */

  form.addEventListener('input', function () {
    render();
    scheduleSave();
  });

  form.addEventListener('change', function () {
    render();
    scheduleSave();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
  });

  els.items.addEventListener('click', function (event) {
    var button = event.target.closest('.remove-item');
    if (!button) { return; }

    var row = button.closest('.item-row');
    if (!row) { return; }

    if (els.items.querySelectorAll('.item-row').length > 1) {
      row.remove();
    } else {
      row.querySelector('.item-description').value = '';
      row.querySelector('.item-qty').value = '1';
      row.querySelector('.item-rate').value = '';
    }

    render();
    saveNow();
  });

  els.addItem.addEventListener('click', function () {
    var row = addItemRow();
    row.querySelector('.item-description').focus();
    render();
    scheduleSave();
  });

  els.logoInput.addEventListener('change', function () {
    var file = els.logoInput.files && els.logoInput.files[0];
    if (!file) { return; }

    if (file.type.indexOf('image/') !== 0) {
      window.alert('Please choose a JPG, PNG or WebP image.');
      els.logoInput.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert('That image is larger than 2 MB. Please choose a smaller file.');
      els.logoInput.value = '';
      return;
    }

    resizeImage(file, 360).then(function (dataUrl) {
      logoSrc = dataUrl;
      renderLogo();
      render();
      saveNow();
      els.logoInput.value = '';
    }).catch(function () {
      window.alert('That image could not be processed. Please try a different file.');
      els.logoInput.value = '';
    });
  });

  els.removeLogo.addEventListener('click', function () {
    logoSrc = '';
    els.logoInput.value = '';
    renderLogo();
    render();
    saveNow();
  });

  els.print.addEventListener('click', function () {
    window.print();
  });

  els.download.addEventListener('click', downloadPdf);

  els.reset.addEventListener('click', function () {
    var confirmed = window.confirm('Clear this invoice and the details saved in this browser?');
    if (!confirmed) { return; }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* Storage may be blocked; the form is still reset below. */
    }

    logoSrc = '';
    form.reset();
    els.items.textContent = '';
    els.issue.value = toISODate(new Date());
    els.due.value = toISODate(addDays(new Date(), 14));
    els.number.value = defaultInvoiceNumber();
    els.currency.value = 'USD';
    els.tax.value = '0';
    els.discount.value = '0';
    els.notes.value = '';

    addItemRow();
    renderLogo();
    render();

    if (els.saveStatus) {
      els.saveStatus.textContent = 'Started a fresh invoice. Nothing is saved until you type.';
    }
  });

  /* --------------------------------------------------------------- Init */

  els.issue.value = toISODate(new Date());
  els.due.value = toISODate(addDays(new Date(), 14));
  els.number.value = defaultInvoiceNumber();

  var restored = restore();
  if (!restored || !els.items.querySelector('.item-row')) {
    addItemRow();
  }
  if (!els.issue.value) { els.issue.value = toISODate(new Date()); }
  if (!els.due.value) { els.due.value = toISODate(addDays(new Date(), 14)); }
  if (!els.number.value) { els.number.value = defaultInvoiceNumber(); }

  renderLogo();
  render();
})();
