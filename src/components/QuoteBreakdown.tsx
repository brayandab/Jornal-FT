import { useTranslation } from 'react-i18next';
import type { RequestLine } from '../api/types';
import { useMoney } from '../state/AppContext';

interface Breakdown {
  lines: RequestLine[];
  totalMinor: number;
  taxIncluded: boolean;
  currency: string;
  moneyScale: number;
}

/** Desglose del pedido: servicio, desplazamiento, impuesto (incluido o sumado) y propina. */
export function QuoteBreakdown({ quote }: { quote: Breakdown }) {
  const { t } = useTranslation();
  const money = useMoney();
  const m = (v: number) => money(v, quote.currency, quote.moneyScale);
  return (
    <table className="breakdown">
      <tbody>
        {quote.lines.map((l, i) => (
          <tr key={i} className={l.includedInTotal ? '' : 'muted'}>
            <th scope="row">
              {lineLabel(l, t)}
              {l.quantity > 1 && <span className="muted small"> × {l.quantity}</span>}
              {!l.includedInTotal && <div className="small">{t('order.taxIncluded')}</div>}
            </th>
            <td>{m(l.amountMinor)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">{t('order.total')}</th>
          <td>{m(quote.totalMinor)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function lineLabel(l: RequestLine, t: (k: string, o?: Record<string, unknown>) => string): string {
  switch (l.kind) {
    case 'SERVICE':
      return l.description;
    case 'TAX':
      return t('lines.TAX', { name: l.description });
    default:
      return t(`lines.${l.kind}`, { defaultValue: l.description });
  }
}
