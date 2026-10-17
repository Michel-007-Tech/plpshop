/**
 * ============================================================
 * FACTURATION PLP SHOP — invoice.js
 * Partagé par index.html (client) et admin.html (administrateur).
 *
 * Une facture est disponible dès que le paiement est validé par
 * l'administrateur, c'est-à-dire pour les commandes au statut
 * « Confirmée », « Expédiée » ou « Livrée ».
 *
 * Aucune donnée n'est stockée en plus : la facture est générée à
 * partir de la commande Firestore existante. Le numéro de facture
 * est FAC-<numéro de commande>.
 *
 * Utilisation :
 *   PLPInvoice.canInvoice(order)  -> true/false
 *   PLPInvoice.show(order)        -> ouvre la facture (imprimer / PDF)
 * ============================================================
 */
(function () {
    // ---- À COMPLÉTER : informations légales de la boutique ----
    var SHOP = {
        name: 'PLP SHOP',
        tagline: 'Mode & Luxe',
        address: 'Dakar, Sénégal',
        phone: '+221 76 859 78 35',
        email: 'contact@plpshop.sn',
        ninea: '',   // ex: '123456789' — affiché sur la facture seulement si renseigné
        rccm: ''     // ex: 'SN-DKR-2024-A-1234' — idem
    };
    var INVOICEABLE = ['Confirmée', 'Expédiée', 'Livrée'];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function fcfa(n) { return (Number(n) || 0).toLocaleString('fr-FR') + ' FCFA'; }
    function longDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function canInvoice(order) {
        return !!order && INVOICEABLE.indexOf(order.status) !== -1;
    }

    function build(order) {
        var items = Array.isArray(order.items) ? order.items : [];
        var subtotal = 0;
        var rows = items.map(function (it) {
            var price = Number(it.price) || 0;
            var qty = Number(it.qty || it.quantity) || 1;
            var line = price * qty;
            subtotal += line;
            return '<tr><td>' + esc(it.name) + '</td>' +
                '<td class="num">' + fcfa(price) + '</td>' +
                '<td class="num">' + qty + '</td>' +
                '<td class="num">' + fcfa(line) + '</td></tr>';
        }).join('');

        var total = Number(order.total) || subtotal;
        var shipping = Math.max(0, total - subtotal);
        var payMethod = order.paymentMethod === 'whatsapp' ? 'Wave (preuve envoyée via WhatsApp)' : (order.paymentMethod || '—');
        var legal = [];
        if (SHOP.ninea) legal.push('NINEA : ' + esc(SHOP.ninea));
        if (SHOP.rccm) legal.push('RCCM : ' + esc(SHOP.rccm));

        return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
            '<title>Facture FAC-' + esc(order.id) + '</title><style>' +
            '@page{size:A4;margin:12mm}' +
            '*{box-sizing:border-box;margin:0;padding:0}' +
            'body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1a1a1a;font-size:13px;line-height:1.5;background:#fff;padding:28px}' +
            '.sheet{max-width:794px;margin:0 auto;position:relative}' +
            '.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:20px;border-bottom:3px solid #c9a84c}' +
            '.brand h1{font-family:Georgia,serif;font-size:28px;letter-spacing:2px}' +
            '.brand span{color:#c9a84c;font-size:11px;letter-spacing:3px;text-transform:uppercase}' +
            '.brand p{margin-top:8px;color:#555;font-size:12px}' +
            '.doc{text-align:right}' +
            '.doc h2{font-family:Georgia,serif;font-size:26px;color:#c9a84c;letter-spacing:3px}' +
            '.doc p{color:#444;font-size:12px}' +
            '.meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0}' +
            '.box{background:#faf8f3;border:1px solid #eee;border-radius:8px;padding:14px 16px}' +
            '.box h3{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;margin-bottom:6px}' +
            '.box p{font-size:12.5px}' +
            'table{width:100%;border-collapse:collapse;margin-top:6px}' +
            'th{background:#0a0a0a;color:#fff;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;text-align:left;padding:10px 12px}' +
            'td{padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top}' +
            '.num{text-align:right;white-space:nowrap}th.num{text-align:right}' +
            '.totals{margin:18px 0 0 auto;width:320px;max-width:100%}' +
            '.totals div{display:flex;justify-content:space-between;padding:6px 12px;font-size:13px}' +
            '.totals .grand{background:#0a0a0a;color:#c9a84c;font-weight:700;font-size:15px;border-radius:6px;margin-top:6px;padding:10px 12px}' +
            '.stamp{position:absolute;right:30px;top:260px;border:3px solid #1e9e57;color:#1e9e57;font-weight:800;font-size:22px;letter-spacing:4px;padding:6px 18px;border-radius:8px;transform:rotate(-12deg);opacity:.75}' +
            '.foot{margin-top:40px;padding-top:14px;border-top:1px solid #ddd;text-align:center;color:#666;font-size:11px}' +
            '.foot strong{color:#1a1a1a}' +
            '@media(max-width:560px){body{padding:14px}.top,.meta{display:block}.doc{text-align:left;margin-top:14px}.box{margin-bottom:10px}.stamp{top:auto;bottom:140px;right:6px;font-size:16px}th,td{padding:8px 6px;font-size:11px}}' +
            '@media print{body{padding:0}.stamp{opacity:.85}}' +
            '</style></head><body><div class="sheet">' +
            '<div class="top"><div class="brand"><h1>' + esc(SHOP.name) + '</h1><span>' + esc(SHOP.tagline) + '</span>' +
            '<p>' + esc(SHOP.address) + '<br>' + esc(SHOP.phone) + ' · ' + esc(SHOP.email) +
            (legal.length ? '<br>' + legal.join(' · ') : '') + '</p></div>' +
            '<div class="doc"><h2>FACTURE</h2><p><strong>N° FAC-' + esc(order.id) + '</strong></p>' +
            '<p>Date de commande : ' + esc(longDate(order.date)) + '</p>' +
            '<p>Commande : ' + esc(order.id) + '</p></div></div>' +
            '<div class="meta"><div class="box"><h3>Facturé à</h3><p><strong>' + esc(order.customerName) + '</strong><br>' +
            esc(order.customerPhone || '') + (order.customerEmail ? '<br>' + esc(order.customerEmail) : '') +
            (order.customerAddress ? '<br>' + esc(order.customerAddress) : '') + '</p></div>' +
            '<div class="box"><h3>Paiement</h3><p>Mode : ' + esc(payMethod) + '<br>Statut : <strong>Payée</strong><br>Livraison : ' +
            esc(order.status === 'Livrée' ? 'Livrée' : order.status === 'Expédiée' ? 'Expédiée' : 'En préparation') + '</p></div></div>' +
            '<div class="stamp">PAYÉE</div>' +
            '<table><thead><tr><th>Désignation</th><th class="num">Prix unitaire</th><th class="num">Qté</th><th class="num">Total</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4">Aucun article</td></tr>') + '</tbody></table>' +
            '<div class="totals"><div><span>Sous-total</span><span>' + fcfa(subtotal) + '</span></div>' +
            '<div><span>Livraison</span><span>' + (shipping === 0 ? 'Gratuite' : fcfa(shipping)) + '</span></div>' +
            '<div class="grand"><span>TOTAL PAYÉ</span><span>' + fcfa(total) + '</span></div></div>' +
            '<div class="foot"><strong>Merci pour votre confiance !</strong><br>' +
            esc(SHOP.name) + ' — ' + esc(SHOP.phone) + ' — ' + esc(SHOP.email) + '</div>' +
            '</div></body></html>';
    }

    function show(order) {
        if (!canInvoice(order)) {
            alert('La facture sera disponible une fois le paiement confirmé par la boutique.');
            return;
        }
        var old = document.getElementById('plpInvoiceOverlay');
        if (old) old.remove();

        var ov = document.createElement('div');
        ov.id = 'plpInvoiceOverlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.82);display:flex;flex-direction:column;align-items:center;padding:12px;backdrop-filter:blur(8px)';

        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;justify-content:center';
        function mkBtn(label, bg, fg) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.style.cssText = 'padding:10px 20px;border:none;border-radius:999px;cursor:pointer;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;background:' + bg + ';color:' + fg;
            return b;
        }
        var printBtn = mkBtn('🖨 Imprimer / Enregistrer en PDF', '#c9a84c', '#0a0a0a');
        var closeBtn = mkBtn('Fermer', '#fff', '#0a0a0a');
        bar.appendChild(printBtn);
        bar.appendChild(closeBtn);

        var frame = document.createElement('iframe');
        frame.title = 'Facture FAC-' + order.id;
        frame.style.cssText = 'flex:1;width:100%;max-width:860px;border:0;border-radius:10px;background:#fff';
        frame.srcdoc = build(order);

        function close() { ov.remove(); document.removeEventListener('keydown', onKey); }
        function onKey(e) { if (e.key === 'Escape') close(); }
        printBtn.onclick = function () { frame.contentWindow.focus(); frame.contentWindow.print(); };
        closeBtn.onclick = close;
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
        document.addEventListener('keydown', onKey);

        ov.appendChild(bar);
        ov.appendChild(frame);
        document.body.appendChild(ov);
    }

    window.PLPInvoice = { canInvoice: canInvoice, show: show, build: build };
})();
