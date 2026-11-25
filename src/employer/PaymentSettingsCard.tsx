import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../design/components';
import { vacancyApi } from '../vacancies/api';
import { friendlyError } from '../api/errors';

/**
 * Configuración de pagos de quien contrata. Activo: al presionar «Finalizar» a una persona, el pago se hace
 * solo. Inactivo: quien contrata registra el pago a mano (y justifica si paga menos de lo acordado).
 */
export function PaymentSettingsCard() {
  const { t } = useTranslation();
  const [auto, setAuto] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vacancyApi.settings().then((s) => setAuto(s.autoPayout)).catch((e) => setError(friendlyError(e, t)));
  }, [t]);

  const change = async (value: boolean) => {
    const previous = auto;
    setAuto(value);
    setBusy(true);
    setError(null);
    try {
      setAuto((await vacancyApi.saveSettings(value)).autoPayout);
    } catch (e) {
      setAuto(previous);
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" data-testid="payment-settings">
      <h2>{t('vac.settings.title')}</h2>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong>{t('vac.settings.autoPayout')}</strong>
          <p className="tw-note" style={{ margin: '4px 0 0' }}>
            {auto ? t('vac.settings.autoOn') : t('vac.settings.autoOff')}
          </p>
        </div>
        <Switch checked={!!auto} disabled={auto === null || busy} onChange={(v) => void change(v)} label={t('vac.settings.autoPayout')} />
      </div>
      {error && <p className="tw-inline-error" role="alert">{error}</p>}
    </section>
  );
}
