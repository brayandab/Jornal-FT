import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ErrorBox, Loading } from '../components/ui';
import { useAction, useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppContext';

/**
 * Comprobante emitido por el subsistema de facturación, del tipo que exige cada país
 * (factura electrónica DIAN, NFS-e, invoice, facture, 適格請求書, Rechnung).
 * Por defecto en el idioma del país; se puede ver en el idioma de la interfaz.
 */
export function ReceiptPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { locale } = useApp();
  const [inMyLanguage, setInMyLanguage] = useState(false);
  const lang = inMyLanguage ? locale : undefined;
  const receipt = useAsync(() => api.receipt(id, lang), [id, lang]);

  const print = useAction(async () => {
    const html = await api.receiptHtml(id, lang);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const w = window.open(url, '_blank');
    w?.addEventListener('load', () => w.print());
  });

  if (receipt.loading && !receipt.data) return <Loading />;
  const v = receipt.data;
  if (!v) return <ErrorBox error={receipt.error} />;
  const r = v.receipt;

  return (
    <div className="stack">
      <Link to={`/requests/${id}`} className="muted">← {t('common.back')}</Link>
      <article className="card receipt" lang={v.language}>
        <header className="receipt-head">
          <div>
            <h1>{v.title}</h1>
            <p className="receipt-number">{r.number}</p>
          </div>
          <div className="right small">
            <strong>{r.issuerName}</strong>
            <div>{r.issuerTaxId}</div>
            <div>{v.issuedAtText}</div>
          </div>
        </header>
        <section className="small">
          <strong>{r.customerLegalName || r.customerName}</strong>
          {r.customerTaxIdNumber && <div>{r.customerTaxIdType} {r.customerTaxIdNumber}</div>}
          <div className="pre muted">{r.addressText}</div>
        </section>
        <table className="breakdown">
          <tbody>
            {v.lines.map((l, i) => (
              <tr key={i} className={l.includedInTotal ? '' : 'muted'}>
                <th scope="row">
                  {l.description}
                  {l.quantity > 1 && <span className="muted small"> × {l.quantity} ({l.unitPrice})</span>}
                </th>
                <td>{l.amount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {Object.entries(v.totals).map(([k, val]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{val}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      </article>
      <div className="row">
        <button className="btn primary" disabled={print.busy} onClick={() => print.run()}>{t('receipt.print')}</button>
        <label className="check">
          <input type="checkbox" checked={inMyLanguage} onChange={(e) => setInMyLanguage(e.target.checked)} />
          {t('receipt.myLanguage')}
        </label>
      </div>
      <ErrorBox error={print.error} />
    </div>
  );
}
