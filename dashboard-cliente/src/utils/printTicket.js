/**
 * printTicket(order, restaurantName, type)
 * Genera un HTML de ticket térmico premium (estilo 80mm/58mm) y lo imprime.
 * Ideal para e-commerce, logística y tiendas.
 */
export function printTicket(order, restaurantName = 'MiProdu', type = 'ticket') {
  // Robust date handling
  let date;
  try {
    if (order.createdAt) {
      if (typeof order.createdAt.toDate === 'function') {
        date = order.createdAt.toDate();
      } else {
        date = new Date(order.createdAt);
      }
    } else {
      date = new Date();
    }
    
    if (isNaN(date.getTime())) {
      date = new Date();
    }
  } catch (e) {
    date = new Date();
  }

  const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const isDelivery = order.orderType === 'delivery';
  const isAccount = type === 'account' || type === 'ticket';
  const isInvoice = type === 'invoice';
  const isComanda = type === 'comanda';

  const formatPrice = (p) =>
    p ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p) : '$0';

  // Consolidate items for client-facing receipts
  let printItems = order.items || [];
  if (isInvoice || isAccount) {
    const consolidatedPrint = {};
    printItems.forEach(item => {
      const key = `${item.name}_${item.price || 0}_${JSON.stringify(item.selectedOptions || '')}_${item.notes || ''}`;
      if (consolidatedPrint[key]) {
        consolidatedPrint[key].quantity += Number(item.quantity || 0);
      } else {
        consolidatedPrint[key] = { ...item, quantity: Number(item.quantity || 0) };
      }
    });
    printItems = Object.values(consolidatedPrint).filter(i => i.quantity !== 0);
  }

  const itemsHtml = printItems.map(item => {
    const itemPrice = item.discountPrice || item.price || 0;
    const is2x1 = item.promotionType === '2x1';
    const isCustom = item.promotionType === 'custom_condition';
    const minQty = isCustom ? (Number(item.promoMinQty) || 1) : 0;
    const isCustomActive = isCustom && item.quantity >= minQty;

    const itemTotal = is2x1
      ? itemPrice * Math.ceil(item.quantity / 2)
      : (isCustomActive 
        ? (itemPrice * item.quantity) * (1 - (Number(item.promoDiscountPct) || 0) / 100)
        : itemPrice * item.quantity);

    return `
    <tr class="item-row">
      <td class="item-qty ${isComanda ? 'comanda-qty-style' : ''}">${item.quantity}</td>
      <td class="item-name">
        <span class="${isComanda ? 'comanda-name-style' : ''}">${item.name}</span>
        ${item.sku ? `<div style="font-size: 10px; color: #4b5563; font-weight: 600; margin-top: 1px;">SKU: ${item.sku}</div>` : ''}
        ${is2x1 ? '<span class="promo-badge">2X1</span>' : ''}
        ${isCustomActive && item.promoLabel ? `<span class="promo-badge promo-green">${item.promoLabel.toUpperCase()}</span>` : ''}
        ${item.observations ? `<div class="item-obs">↳ ${item.observations}</div>` : ''}
      </td>
      ${!isComanda && itemPrice ? `<td class="item-price">${formatPrice(itemTotal)}</td>` : '<td class="item-price"></td>'}
    </tr>
  `}).join('');

  const total = printItems.reduce((s, i) => {
    const itemPrice = i.discountPrice || i.price || 0;
    const is2x1 = i.promotionType === '2x1';
    const isCustom = i.promotionType === 'custom_condition';
    const minQty = isCustom ? (Number(i.promoMinQty) || 1) : 0;
    const isCustomActive = isCustom && (i.quantity || 1) >= minQty;

    const itemTotal = is2x1
      ? itemPrice * Math.ceil((i.quantity || 1) / 2)
      : (isCustomActive
        ? (itemPrice * (i.quantity || 1)) * (1 - (Number(i.promoDiscountPct) || 0) / 100)
        : itemPrice * (i.quantity || 1));

    return s + itemTotal;
  }, 0);

  let titleText = 'COMPROBANTE';
  if (isInvoice) titleText = 'FACTURA DE VENTA';
  else if (isAccount) titleText = 'CUENTA DE COBRO';
  else if (isComanda) titleText = 'ORDEN DE PREPARACIÓN';

  const orderNumberStr = order.orderNumber || String(order.id ?? '').slice(-6).toUpperCase() || '------';

  // Logistics & E-commerce fulfillment label translation
  const isPickup = order.orderType === 'pickup';
  const isCounter = order.orderType === 'counter';
  let orderTypeLabel = 'PEDIDO LOCAL';
  if (isDelivery) orderTypeLabel = 'ENVÍO A DOMICILIO';
  else if (isPickup) orderTypeLabel = 'RETIRA EN TIENDA';
  else if (isCounter) orderTypeLabel = 'ENTREGA EN MOSTRADOR';
  else if (order.tableNumber && order.tableNumber !== 'Barra/Mostrador' && order.tableNumber !== 'Domicilio') {
    orderTypeLabel = `UBICACIÓN: ${order.tableNumber}`;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${titleText} #${orderNumberStr}</title>
  <style>
    /* Premium Ticket styling */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      line-height: 1.45;
      width: 80mm;
      margin: 0 auto;
    }

    .ticket {
      width: 100%;
      max-width: 80mm;
      padding: 4mm;
      margin: 0 auto;
    }

    /* Typography Utilities */
    .text-center { text-align: center; }
    .text-right  { text-align: right; }
    .text-left   { text-align: left; }
    .font-bold   { font-weight: 700; }
    .uppercase   { text-transform: uppercase; }

    /* Header formatting */
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
      color: #000;
    }
    
    .receipt-title {
      font-size: 14px;
      font-weight: 700;
      margin: 4px 0;
      color: #374151;
      letter-spacing: 0.5px;
      border: 1px solid #111827;
      display: inline-block;
      padding: 3px 8px;
      text-transform: uppercase;
    }
    
    .order-number {
      font-size: 18px;
      font-weight: 800;
      margin: 6px 0 2px 0;
      color: #000;
    }

    /* Metadata table */
    .meta-info {
      font-size: 11px;
      color: #374151;
      margin: 8px 0;
    }
    
    .meta-info table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-info td {
      padding: 2px 0;
      vertical-align: top;
    }

    /* Thin dividers */
    .divider {
      border: none;
      border-top: 1px dashed #9ca3af;
      margin: 10px 0;
    }
    .divider-solid {
      border: none;
      border-top: 2px solid #111827;
      margin: 10px 0;
    }

    /* Badge */
    .badge {
      display: inline-block;
      background: #f3f4f6;
      border: 1px solid #111827;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 4px;
      margin: 5px 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-inverse {
      background: #111827;
      color: #fff;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    .items-table th {
      font-size: 11px;
      font-weight: 700;
      border-bottom: 2px solid #111827;
      padding-bottom: 5px;
      text-transform: uppercase;
    }
    .items-table td {
      padding: 7px 0;
      vertical-align: top;
      border-bottom: 1px solid #f3f4f6;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .item-qty {
      width: 15%;
      font-weight: 700;
      font-size: 13px;
    }
    .item-name {
      width: 60%;
      padding-right: 5px;
    }
    .item-price {
      width: 25%;
      text-align: right;
      font-weight: 500;
    }
    
    /* Highlighted quantity & name for preparation ticket (comanda) */
    .comanda-qty-style {
      font-size: 16px;
      font-weight: 900;
      color: #000;
      background: #f3f4f6;
      border-radius: 3px;
      text-align: center;
      padding: 2px 4px;
      display: inline-block;
    }
    .comanda-name-style {
      font-size: 14px;
      font-weight: 700;
      color: #000;
    }

    .item-obs {
      font-size: 11px;
      color: #1f2937;
      background: #f9fafb;
      border-left: 3px solid #111827;
      padding: 4px 8px;
      margin-top: 4px;
      border-radius: 0 4px 4px 0;
      font-weight: 600;
    }

    .promo-badge {
      font-size: 9px;
      font-weight: 800;
      background: #111827;
      color: #fff;
      padding: 1px 4px;
      border-radius: 2px;
      margin-left: 4px;
      display: inline-block;
    }
    .promo-green {
      background: #059669;
    }

    /* Totals Table */
    .totals-table {
      width: 100%;
      margin-top: 8px;
      font-size: 12px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 4px 0;
    }
    .total-label {
      text-align: right;
      padding-right: 15px;
      color: #4b5563;
    }
    .total-amount {
      text-align: right;
      width: 35%;
      font-weight: 600;
    }
    .grand-total {
      font-size: 16px;
      font-weight: 800;
      color: #000;
    }
    .grand-total td {
      padding-top: 8px;
      border-top: 2px double #111827;
    }

    /* Observations Box */
    .observations-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 8px;
      margin-top: 12px;
      font-size: 11px;
      border-radius: 4px;
      line-height: 1.4;
    }

    /* Footer styles */
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: #4b5563;
      border-top: 1px dashed #d1d5db;
      padding-top: 12px;
    }
    .footer p {
      margin-bottom: 4px;
    }

    /* Print Settings */
    @media print {
      @page { margin: 0; size: 80mm auto; }
      html, body { width: 80mm; margin: 0; }
      .ticket { width: 80mm; padding: 4mm; }
    }
  </style>
</head>
<body>
<div class="ticket">

  <!-- HEADER -->
  <div class="text-center">
    <div class="brand-name">${restaurantName}</div>
    ${isInvoice ? '<div class="meta-info" style="margin: 0; font-size: 10px;">Régimen Simplificado</div>' : ''}
    <div class="receipt-title">${titleText}</div>
    <div class="order-number"># ${orderNumberStr}</div>
  </div>

  <hr class="divider-solid"/>

  <!-- META INFO -->
  <div class="meta-info">
    <table>
      <tr>
        <td><strong>Fecha:</strong> ${dateStr}</td>
        <td class="text-right"><strong>Hora:</strong> ${timeStr}</td>
      </tr>
      ${order.customerName ? `
      <tr>
        <td colspan="2"><strong>Cliente:</strong> ${order.customerName}</td>
      </tr>
      ` : ''}
      ${isDelivery && order.customerPhone ? `
      <tr>
        <td colspan="2"><strong>Celular:</strong> ${order.customerPhone}</td>
      </tr>
      ` : ''}
      ${isDelivery && order.customerAddress ? `
      <tr>
        <td colspan="2"><strong>Dirección:</strong> ${order.customerAddress}</td>
      </tr>
      ` : ''}
      ${isInvoice && order.billedByWaiterName ? `
      <tr>
        <td colspan="2"><strong>Vendedor:</strong> ${order.billedByWaiterName}</td>
      </tr>
      ` : (order.waiterName ? `
      <tr>
        <td colspan="2"><strong>Vendedor:</strong> ${order.waiterName}</td>
      </tr>
      ` : '')}
    </table>
  </div>

  <!-- TIPO DE DESPACHO / DE PEDIDO -->
  <div class="text-center">
    <div class="badge ${isDelivery ? 'badge-inverse' : ''}">
      ${orderTypeLabel}
    </div>
  </div>

  <hr class="divider"/>

  <!-- ITEMS -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="text-left">CANT</th>
        <th class="text-left">DESCRIPCIÓN</th>
        ${!isComanda ? '<th class="text-right">TOTAL</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <!-- TOTALS -->
  ${!isComanda && total > 0 ? `
  <hr class="divider"/>
  <table class="totals-table">
    ${(order.tip || order.discount || order.suggestedTip) ? `
      <tr>
        <td class="total-label">Subtotal:</td>
        <td class="total-amount">${formatPrice(order.subtotal || total)}</td>
      </tr>
    ` : ''}
    
    ${order.suggestedTip ? `
      <tr>
        <td class="total-label">Propina Sugerida (${order.tipPercentage || 10}%):</td>
        <td class="total-amount">${formatPrice(order.suggestedTip)}</td>
      </tr>
    ` : ''}

    ${order.tip && order.tip > 0 ? `
      <tr>
        <td class="total-label">Propina:</td>
        <td class="total-amount">${formatPrice(order.tip)}</td>
      </tr>
    ` : ''}

    ${order.discount && order.discount > 0 ? `
      <tr>
        <td class="total-label">Descuento:</td>
        <td class="total-amount">-${formatPrice(order.discount)}</td>
      </tr>
    ` : ''}

    <tr class="grand-total">
      <td class="total-label uppercase" style="color: #000;">Total</td>
      <td class="total-amount">${formatPrice(order.total || total)}</td>
    </tr>
    
    ${order.paymentMethod === 'mixed' && order.mixedPayments ? `
      <tr><td colspan="2" style="padding-top: 8px; text-align: center; font-weight: bold; font-size: 11px;">MÉTODOS DE PAGO</td></tr>
      ${order.mixedPayments.map(mp => `
        <tr>
          <td class="total-label" style="font-weight: normal; font-size: 11px;">${
            mp.methodId === 'cash' ? 'Efectivo' :
            mp.methodId === 'card' ? 'Tarjeta' :
            mp.methodId === 'transfer' ? 'Transferencia' : mp.methodId
          }:</td>
          <td class="total-amount" style="font-weight: normal; font-size: 11px;">${formatPrice(mp.amount)}</td>
        </tr>
      `).join('')}
    ` : order.paymentMethod ? `
      <tr>
        <td class="total-label" style="font-weight: normal; font-size: 11px; padding-top: 5px;">Método:</td>
        <td class="total-amount" style="font-weight: normal; font-size: 11px; padding-top: 5px; text-transform: uppercase;">${
          order.paymentMethod === 'cash' ? 'Efectivo' :
          order.paymentMethod === 'card' ? 'Tarjeta' :
          order.paymentMethod === 'transfer' ? 'Transferencia' :
          order.paymentMethod === 'cod' ? 'Contraentrega' : order.paymentMethod
        }</td>
      </tr>
    ` : ''}
  </table>
  ` : ''}

  <!-- OBSERVACIONES GLOBALES -->
  ${order.globalObservations ? `
  <div class="observations-box">
    <strong>OBSERVACIONES:</strong><br/>
    ${order.globalObservations}
  </div>
  ` : ''}

  <!-- HISTORIAL DE LOGÍSTICA (SI APLICA) -->
  ${order.editLog && !isInvoice ? `
  <div style="font-size:10px; color:#6b7280; margin-top:10px; border-top: 1px dotted #d1d5db; padding-top:5px; line-height: 1.3;">
    <strong>Novedades del Pedido:</strong><br/>
    ${order.editLog.replace(/\n/g, '<br/>')}
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    ${isInvoice ? `
      <p>Este documento es una representación gráfica<br/>de un ticket de venta.</p>
    ` : ''}
    <p class="font-bold">¡Gracias por tu compra!</p>
    <p style="margin-top: 4px; font-size: 9px; color: #9ca3af;">Desarrollado por MiProdu</p>
  </div>

</div>
<script>
  window.onload = function() {
    window.print();
    window.onafterprint = function() { window.close(); };
    setTimeout(function() { window.close(); }, 4000);
  };
</script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=400,height=600,toolbar=0,scrollbars=0,status=0');
  if (!printWin) {
    console.warn('Printing blocked by browser pop-up blocker.');
    return false;
  }
  printWin.document.write(html);
  printWin.document.close();
  return true;
}
