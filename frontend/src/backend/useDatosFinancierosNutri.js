import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const recordIds = ownerIdFields
    .map((field) => String(record[field] || '').trim())
    .filter(Boolean);
  
  const recordEmails = ownerEmailFields
    .map((field) => normalize(record[field]))
    .filter(Boolean);

  const hasOwnerData = recordIds.length > 0 || recordEmails.length > 0;
  if (!hasOwnerData) return true;

  const userId = String(user.uid || '').trim();
  const userEmail = normalize(user.email);

  // Try matching by ID
  if (userId && recordIds.includes(userId)) {
    return true;
  }

  // Try matching by email  
  if (userEmail && recordEmails.includes(userEmail)) {
    return true;
  }

  // If owner data exists but no match, don't include
  return false;
};

export function useDatosFinancierosNutri() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessLimited, setAccessLimited] = useState(false);

  const nutritionist = useMemo(() => {
    const currentUser = getCurrentUser();
    const user = {
      uid: currentUser?.uid || '',
      email: currentUser?.email || localStorage.getItem('nutritionist_username') || ''
    };
    
    return user;
  }, []);

  const loadSales = useCallback(async () => {
    const salesResult = await getSales({
      limit: 400,
      staffId: nutritionist.uid || undefined,
      staffEmail: nutritionist.email || undefined
    });

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

    setAccessLimited(false);
    setSales(salesResult.data || []);
    setError('');
    setLoading(false);
  }, [nutritionist.email, nutritionist.uid]);

  // Initial load and auto-refresh
  useEffect(() => {
    let mounted = true;
    let refreshInterval = null;

    const executeLoad = async () => {
      if (mounted) {
        await loadSales();
      }
    };

    executeLoad();

    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(() => {
      if (mounted) {
        loadSales();
      }
    }, 30000);

    return () => {
      mounted = false;
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [loadSales]);

  const computed = useMemo(() => {
    const ownPlanSales = sales.filter((sale) => detectPlanSale(sale));

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

  const reloadData = useCallback(async () => {
    console.debug('[useDatosFinancierosNutri] reloadData called');
    await loadSales();
  }, [loadSales]);

  return {
    ...computed,
    loading,
    error,
    accessLimited,
    reloadData
  };
}
