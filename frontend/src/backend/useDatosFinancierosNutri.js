import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getSales } from '../firebase';

const ownerIdFields = [
  'nutriologoId',
  'nutritionistId',
  'nutriId',
  'createdBy',
  'created_by',
  'sellerId',
  'vendedorId',
  'staffId'
];

const ownerEmailFields = [
  'nutriologoEmail',
  'nutritionistEmail',
  'nutriEmail',
  'emailNutriologo',
  'sellerEmail',
  'vendedorEmail',
  'staffEmail',
  'createdByEmail',
  'created_by_email'
];

const isPermissionDenied = (errorMessage = '') => {
  const msg = String(errorMessage || '').toLowerCase();
  return msg.includes('missing or insufficient permissions') || msg.includes('permission-denied');
};

const parseMoney = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
};

const parseSaleItems = (sale) => {
  const raw = sale.detalle_productos;
  if (!raw) return [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const detectPlanSale = (sale) => {
  const tipoVenta = normalize(sale.tipo_venta);
  if (tipoVenta.includes('plan') || tipoVenta.includes('nutri') || tipoVenta.includes('dieta')) {
    return true;
  }

  const items = parseSaleItems(sale);
  const labels = items
    .map((item) => normalize(item.nombre || item.title || item.descripcion || item.description))
    .filter(Boolean)
    .join(' ');

  return labels.includes('plan') || labels.includes('nutri') || labels.includes('dieta') || labels.includes('aliment');
};

const matchesOwner = (record, user) => {
  if (!user?.uid && !user?.email) return true;

  const recordIds = ownerIdFields.map((field) => String(record[field] || '').trim()).filter(Boolean);
  const recordEmails = ownerEmailFields.map((field) => normalize(record[field])).filter(Boolean);

  const hasOwnerData = recordIds.length > 0 || recordEmails.length > 0;
  if (!hasOwnerData) return true;

  const userId = String(user.uid || '').trim();
  const userEmail = normalize(user.email);

  const idMatch = userId ? recordIds.includes(userId) : false;
  const emailMatch = userEmail ? recordEmails.includes(userEmail) : false;

  return idMatch || emailMatch;
};

export function useDatosFinancierosNutri() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessLimited, setAccessLimited] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const nutritionist = useMemo(() => {
    const currentUser = getCurrentUser();
    return {
      uid: currentUser?.uid || '',
      email: currentUser?.email || localStorage.getItem('nutritionist_username') || ''
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSales = async () => {
      const salesResult = await getSales({ limit: 400 });
      if (!mounted) return;

      if (!salesResult.success) {
        const salesError = salesResult.error || 'No se pudieron cargar las ventas.';

        if (isPermissionDenied(salesError)) {
          setAccessLimited(true);
          setSales([]);
          setLoading(false);
          return;
        }

        setError(salesError);
        setLoading(false);
        return;
      }

      setSales(salesResult.data || []);
      setLoading(false);
    };

    loadSales();

    return () => {
      mounted = false;
    };
  }, [reloadTick]);

  const computed = useMemo(() => {
    const ownPlanSales = sales
      .filter((sale) => matchesOwner(sale, nutritionist))
      .filter((sale) => detectPlanSale(sale));

    const plansTotal = ownPlanSales.reduce((acc, sale) => {
      const total = parseMoney(sale.total, NaN);
      if (!Number.isNaN(total)) return acc + total;

      const itemTotal = parseSaleItems(sale).reduce((sum, item) => {
        const qty = parseMoney(item.cantidad, 1);
        const price = parseMoney(item.precio || item.price, 0);
        return sum + qty * price;
      }, 0);

      return acc + itemTotal;
    }, 0);

    const monthlyMap = new Map();

    ownPlanSales.forEach((sale) => {
      const date = toDate(sale.createdAt || sale.fecha || sale.fechaRegistro);
      if (!date) return;
      const key = monthKey(date);
      const base = monthlyMap.get(key) || {
        month: key,
        label: monthLabel(key),
        consultas: 0,
        planes: 0,
        total: 0
      };

      const amount = parseMoney(sale.total, 0);
      base.planes += amount;
      base.total += amount;
      monthlyMap.set(key, base);
    });

    const monthlyData = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-8);

    return {
      nutritionist,
      consultationsCount: 0,
      plansCount: ownPlanSales.length,
      consultationsTotal: 0,
      plansTotal,
      grandTotal: plansTotal,
      monthlyData,
      appointments: [],
      planSales: ownPlanSales
    };
  }, [sales, nutritionist]);

  return {
    ...computed,
    loading,
    error,
    accessLimited,
    reloadData: () => setReloadTick((value) => value + 1)
  };
}
