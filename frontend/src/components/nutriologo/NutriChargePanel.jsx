import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Search, UserRound, XCircle } from 'lucide-react';
import { createMembershipSale, getAllMembers, getCurrentUser } from '../../firebase';

const DEFAULT_PRICE = 500;

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(Number(value || 0));
};

export default function NutriChargePanel({ onChargeCreated }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState(String(DEFAULT_PRICE));
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    let mounted = true;

    const loadMembers = async () => {
      setLoadingMembers(true);
      const membersResult = await getAllMembers();
      if (!mounted) return;

      if (!membersResult.success) {
        setMembers([]);
        setMessage(membersResult.error || 'No se pudo cargar la lista de clientes.');
        setMessageType('error');
        setLoadingMembers(false);
        return;
      }

      const allMembers = Array.isArray(membersResult.data) ? membersResult.data : [];
      const listToShow = allMembers.map((member) => ({
        id: member.id,
        userId: String(member.userId || ''),
        authUid: member.authUid || '',
        email: member.email || '',
        nombre: member.nombre || '',
        apellido: member.apellido || '',
        createdAt: member.createdAt || null
      }));

      setMembers(listToShow);
      setLoadingMembers(false);
    };

    loadMembers();

    return () => {
      mounted = false;
    };
  }, []);

  const memberOptions = useMemo(() => {
    const sortedByRecent = [...members].sort((a, b) => {
      const aCreated = new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt || 0).getTime() || 0;
      const bCreated = new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt || 0).getTime() || 0;

      if (bCreated !== aCreated) return bCreated - aCreated;

      const aId = Number(a.id);
      const bId = Number(b.id);
      if (!Number.isNaN(aId) && !Number.isNaN(bId)) return bId - aId;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

    const sortedByName = [...members].sort((a, b) => {
      const nameA = `${a.nombre || ''} ${a.apellido || ''}`.trim().toLowerCase();
      const nameB = `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es');
    });

    const baseList = sortBy === 'name' ? sortedByName : sortedByRecent;

    const term = normalize(search);
    if (!term) return baseList;

    return baseList.filter((member) => {
      const fullName = `${member.nombre || ''} ${member.apellido || ''}`;
      return (
        normalize(fullName).includes(term) ||
        normalize(member.email || '').includes(term) ||
        normalize(member.userId || '').includes(term)
      );
    });
  }, [members, search, sortBy]);

  const selectedMember = useMemo(() => {
    return members.find((member) => String(member.id) === String(selectedMemberId)) || null;
  }, [members, selectedMemberId]);

  const handleCharge = async () => {
    const total = Number(amount || 0);
    if (!selectedMember) {
      setMessage('Selecciona un cliente para registrar el cobro.');
      setMessageType('error');
      return;
    }

    if (!Number.isFinite(total) || total <= 0) {
      setMessage('Ingresa un monto valido mayor a cero.');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage('');

    const currentUser = getCurrentUser();
    const fullName = `${selectedMember.nombre || ''} ${selectedMember.apellido || ''}`.trim() || 'Cliente';
    const clientId = String(selectedMember.userId || '').trim();

    const result = await createMembershipSale({
      cliente_id: clientId || null,
      metodo_pago: paymentMethod,
      total,
      monto_recibido: paymentMethod === 'EFECTIVO' ? total : total,
      membership_name: 'Plan Nutricional',
      tipo_venta: 'PLAN_NUTRICIONAL',
      sellerId: currentUser?.uid || '',
      sellerEmail: currentUser?.email || localStorage.getItem('nutritionist_username') || '',
      vendedorId: currentUser?.uid || '',
      vendedorEmail: currentUser?.email || localStorage.getItem('nutritionist_username') || '',
      cliente_auth_uid: selectedMember.authUid || '',
      cliente_nombre_override: fullName,
      cliente_email_override: selectedMember.email || ''
    });

    if (!result.success) {
      setMessage(result.error || 'No se pudo registrar el cobro.');
      setMessageType('error');
      setSaving(false);
      return;
    }

    setMessage(`Cobro registrado correctamente. Folio: ${result.folio}`);
    setMessageType('success');
    setSaving(false);

    if (typeof onChargeCreated === 'function') {
      onChargeCreated();
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
        Cobrar Plan Nutricional
      </h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-3">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                Clientes para Cobro
              </h4>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="recent">Mas recientes</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-700">
              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[460px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-800">
                    <tr className="text-slate-300">
                      <th className="px-2 py-2 font-bold uppercase tracking-wide">ID</th>
                      <th className="px-2 py-2 font-bold uppercase tracking-wide">Usuario</th>
                      <th className="px-2 py-2 font-bold uppercase tracking-wide">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberOptions.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-3 py-4 text-center text-slate-400">
                          {loadingMembers ? 'Cargando clientes...' : 'No hay clientes para mostrar.'}
                        </td>
                      </tr>
                    )}

                    {memberOptions.map((member) => {
                      const fullName = `${member.nombre || ''} ${member.apellido || ''}`.trim() || 'Sin nombre';
                      const isSelected = String(selectedMemberId) === String(member.id);

                      return (
                        <tr
                          key={member.id}
                          onClick={() => setSelectedMemberId(member.id)}
                          className={`cursor-pointer border-t border-slate-800 transition-colors ${
                            isSelected ? 'bg-cyan-500/10' : 'hover:bg-slate-800/70'
                          }`}
                        >
                          <td className="px-2 py-2 text-cyan-300">{member.id}</td>
                          <td className="px-2 py-2 text-slate-100">
                            <p className="font-semibold">{fullName}</p>
                            <p className="text-[10px] text-slate-400">{member.userId || 'Sin userId'}</p>
                          </td>
                          <td className="px-2 py-2 text-slate-300">{member.email || 'Sin email'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedMember && (
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-xs text-cyan-100">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <UserRound size={13} />
                Cliente seleccionado
              </div>
              <p>{`${selectedMember.nombre || ''} ${selectedMember.apellido || ''}`.trim() || 'Sin nombre'}</p>
              <p className="text-cyan-200/80">{selectedMember.email || 'Sin email'}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Monto a cobrar
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
          />

          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Metodo de pago
          </label>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            Total: <span className="font-bold">{formatCurrency(amount)}</span>
          </div>

          <button
            type="button"
            onClick={handleCharge}
            disabled={saving || loadingMembers}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CreditCard size={16} />
            {saving ? 'Registrando cobro...' : 'Cobrar ahora'}
          </button>

          {message && (
            <div
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                messageType === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-red-500/40 bg-red-500/10 text-red-100'
              }`}
            >
              {messageType === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span>{message}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
