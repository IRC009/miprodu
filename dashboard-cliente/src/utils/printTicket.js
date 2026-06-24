/**
 * printTicket(order, restaurantName)
 * Genera un HTML de ticket térmico estilo 58mm/80mm y lo imprime
 * usando una ventana emergente con @media print.
 */
export function printTicket(order, restaurantName = 'Carta Y Mesa', type = 'ticket') {
  // Robust date handling
  let date;
  try {
    if (order.createdAt) {
      // Check if it's a Firebase Timestamp
      if (typeof order.createdAt.toDate === 'function') {
        date = order.createdAt.toDate();
      } else {
        date = new Date(order.createdAt);
      }
    } else {
      date = new Date();
    }
    
    // Fallback if Date is still invalid
    if (isNaN(date.getTime())) {
      date = new Date();
    }
  } catch (e) {
    date = new Date();
  }

  const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const isDelivery = order.orderType === 'delivery';
  const isAccount = type === 'account';
  const isInvoice = type === 'invoice';
  const isComanda = type === 'comanda';

  const formatPrice = (p) =>
    p ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p) : '';

  // For invoices and accounts, consolidate items with the same name/price/options
  // into a single line (ignoring itemStatus). This keeps the printed receipt clean
  // even when items came from orders with different dispatch states.
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

  const itemsHtml = (printItems).map(item => {
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
      <td class="item-qty">${item.quantity}</td>
      <td class="item-name">
        ${item.name}
        ${is2x1 ? '<span style="font-size:9px; font-weight:bold; background:#000; color:#fff; padding:1px 4px; border-radius:2px; margin-left:4px;">2X1</span>' : ''}
        ${isCustomActive && item.promoLabel ? `<span style="font-size:9px; font-weight:bold; background:#10b981; color:#fff; padding:1px 4px; border-radius:2px; margin-left:4px;">${item.promoLabel.toUpperCase()}</span>` : ''}
        ${item.observations && !(isInvoice || isAccount) ? `<div class="item-obs">↳ ${item.observations}</div>` : ''}
      </td>
      ${!(isComanda) && itemPrice ? `<td class="item-price">${formatPrice(itemTotal)}</td>` : '<td class="item-price"></td>'}
    </tr>
  `}).join('');

  const total = (printItems).reduce((s, i) => {
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

  let titleText = 'TICKET';
  if (isInvoice) titleText = 'FACTURA DE VENTA';
  else if (isAccount) titleText = 'CUENTA DE COBRO';
  else if (isComanda) titleText = 'ORDEN DE COCINA';

  const orderNumberStr = order.orderNumber || String(order.id ?? '').slice(-6).toUpperCase() || '------';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${titleText} #${orderNumberStr}</title>
  <style>
    /* Reset and Base Styles */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #000;
      background: #fff;
      line-height: 1.4;
      width: 80mm;
      margin: 0 auto;
    }

    /* Container for the receipt */
    .ticket {
      width: 100%;
      max-width: 80mm;
      padding: 5mm;
      margin: 0 auto;
    }

    /* Utilities */
    .text-center { text-align: center; }
    .text-right  { text-align: right; }
    .text-left   { text-align: left; }
    .font-bold   { font-weight: bold; }
    .uppercase   { text-transform: uppercase; }

    /* Headers */
    .brand-name {
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 1px;
    }
    
    .receipt-title {
      font-size: 14px;
      font-weight: bold;
      margin: 5px 0;
      letter-spacing: 0.5px;
    }
    
    .order-number {
      font-size: 18px;
      font-weight: 900;
      margin-bottom: 5px;
    }

    /* Metadata Info */
    .meta-info {
      font-size: 11px;
      color: #333;
      margin-bottom: 5px;
    }
    
    .meta-info table {
      width: 100%;
    }
    .meta-info td {
      padding: 1px 0;
    }

    /* Dividers */
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .divider-solid {
      border: none;
      border-top: 2px solid #000;
      margin: 8px 0;
    }

    /* Badges */
    .badge {
      display: inline-block;
      border: 1.5px solid #000;
      padding: 4px 10px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 4px;
      margin: 5px 0;
    }
    
    .badge-inverse {
      background: #000;
      color: #fff;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    .items-table th {
      font-size: 10px;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 3px;
    }
    .items-table td {
      padding: 4px 0;
      vertical-align: top;
    }
    .item-qty {
      width: 15%;
      font-weight: bold;
    }
    .item-name {
      width: 60%;
      padding-right: 5px;
    }
    .item-price {
      width: 25%;
      text-align: right;
    }
    .item-obs {
      font-size: 10px;
      color: #555;
      margin-top: 2px;
      font-style: italic;
    }

    /* Totals Section */
    .totals-table {
      width: 100%;
      margin-top: 5px;
      font-size: 12px;
    }
    .totals-table td {
      padding: 3px 0;
    }
    .total-label {
      text-align: right;
      padding-right: 15px;
    }
    .total-amount {
      text-align: right;
      width: 35%;
    }
    .grand-total {
      font-size: 16px;
      font-weight: 900;
    }
    .grand-total td {
      padding-top: 6px;
      border-top: 1px solid #000;
    }

    /* Observations Box */
    .observations-box {
      border: 1px solid #000;
      padding: 6px;
      margin-top: 10px;
      font-size: 11px;
      border-radius: 4px;
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 15px;
      font-size: 11px;
      color: #333;
    }
    .footer p {
      margin-bottom: 3px;
    }

    /* Print Settings */
    @media print {
      @page { margin: 0; size: 80mm auto; }
      html, body { width: 80mm; margin: 0; }
      .ticket { width: 80mm; padding: 5mm; }
    }
  </style>
</head>
<body>
<div class="ticket">

  <!-- HEADER -->
  <div class="text-center">
    <div class="brand-name">${restaurantName}</div>
    ${isInvoice ? '<div class="meta-info">NIT: 900.000.000-1</div>' : ''} <!-- Placeholder for NIT if needed -->
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
        <td colspan="2"><strong>Tel:</strong> ${order.customerPhone}</td>
      </tr>
      ` : ''}
      ${isDelivery && order.customerAddress ? `
      <tr>
        <td colspan="2"><strong>Dir:</strong> ${order.customerAddress}</td>
      </tr>
      ` : ''}
      ${isInvoice && order.billedByWaiterName ? `
      <tr>
        <td colspan="2"><strong>Cajero:</strong> ${order.billedByWaiterName}</td>
      </tr>
      ` : ''}
      ${isComanda && order.waiterName ? `
      <tr>
        <td colspan="2"><strong>Mesero:</strong> ${order.waiterName}</td>
      </tr>
      ` : ''}
    </table>
  </div>

  <!-- TIPO DE PEDIDO -->
  <div class="text-center">
    <div class="badge ${isDelivery ? 'badge-inverse' : ''}">
      ${isDelivery ? '🏠 DOMICILIO' : `🪑 MESA ${order.tableNumber || 'N/A'}`}
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
        <td class="total-label">Propina Sugerida (${order.tipPercentage}%):</td>
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
      <td class="total-label uppercase">Total a Pagar</td>
      <td class="total-amount">${formatPrice(order.total || total)}</td>
    </tr>
    
    ${order.paymentMethod === 'mixed' && order.mixedPayments ? `
      <tr><td colspan="2" style="padding-top: 10px; text-align: center; font-weight: bold;">MÉTODOS DE PAGO</td></tr>
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
        <td class="total-amount" style="font-weight: normal; font-size: 11px; padding-top: 5px;">${
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
    <strong>⚠ NOTAS:</strong><br/>
    ${order.globalObservations}
  </div>
  ` : ''}

  <!-- HISTORIAL DE EDICIONES (COMANDAS) -->
  ${order.editLog && !isInvoice ? `
  <div style="font-size:10px; color:#666; margin-top:10px; border-top: 1px dotted #ccc; padding-top:5px;">
    <strong>Historial de Comanda:</strong><br/>
    ${order.editLog.replace(/\n/g, '<br/>')}
  </div>
  ` : ''}

  <hr class="divider-solid" style="margin-top: 15px;"/>

  <!-- FOOTER -->
  <div class="footer">
    ${isInvoice ? `
      <p>Este documento es una representación gráfica<br/>de un ticket de venta.</p>
    ` : ''}
    <p class="font-bold">¡Gracias por tu preferencia!</p>
    <p style="margin-top: 5px;">Desarrollado por Carta Y Mesa</p>
  </div>

</div>
<script>
  window.onload = function() {
    window.print();
    // Cerrar la ventana tras imprimir en la mayoría de navegadores
    window.onafterprint = function() { window.close(); };
    // Fallback timeout
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

