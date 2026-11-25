import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/endpoints';
import type { Role, Verification } from '../../api/types';
import { ErrorBox, Loading, Select } from '../../components/ui';
import { useAction, useAsync } from '../../lib/useAsync';

const ROLES: Role[] = ['APPLICANT', 'BUSINESS', 'WORKER', 'ADMIN'];

/** Usuarios de la región y verificación de trabajadores. */
export function UsersPage() {
  const { t } = useTranslation();
  const [rol, setRol] = useState<Role | ''>('WORKER');
  const [page, setPage] = useState(0);
  const users = useAsync(() => api.adminUsers({ rol: rol || undefined, page, size: 20 }), [rol, page]);
  const verify = useAction(async (id: string, state: Verification) => {
    await api.setVerification(id, state);
    await users.reload();
  });

  return (
    <div className="stack">
      <h1>{t('admin.users')}</h1>
      <Select label={t('profile.role')} value={rol} onChange={(e) => { setPage(0); setRol(e.target.value as Role | ''); }}>
        <option value="">{t('requests.all')}</option>
        {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
      </Select>
      {users.loading && !users.data && <Loading />}
      <ErrorBox error={users.error ?? verify.error} />
      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr><th>{t('admin.name')}</th><th>{t('auth.email')}</th><th>{t('profile.role')}</th><th>{t('profile.verification')}</th><th /></tr>
          </thead>
          <tbody>
            {users.data?.items.map((u) => (
              <tr key={u.id}>
                <th scope="row">{u.name}</th>
                <td className="small">{u.email}</td>
                <td>{t(`roles.${u.rol}`)}</td>
                <td><span className={`badge badge-${u.verificationState === 'VERIFIED' ? 'ok' : u.verificationState === 'REJECTED' ? 'bad' : 'warn'}`}>
                  {t(`verification.${u.verificationState}`)}</span></td>
                <td className="row nowrap">
                  {u.verificationState !== 'VERIFIED' && (
                    <button className="btn small primary" disabled={verify.busy} onClick={() => verify.run(u.id, 'VERIFIED')}>{t('admin.verify')}</button>
                  )}
                  {u.verificationState !== 'REJECTED' && u.rol !== 'ADMIN' && (
                    <button className="btn small ghost" disabled={verify.busy} onClick={() => verify.run(u.id, 'REJECTED')}>{t('admin.reject')}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.data && users.data.totalPages > 1 && (
        <div className="pager">
          <button className="btn small" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
          <span>{t('common.page', { page: page + 1, total: users.data.totalPages })}</span>
          <button className="btn small" disabled={page + 1 >= users.data.totalPages} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
        </div>
      )}
    </div>
  );
}
