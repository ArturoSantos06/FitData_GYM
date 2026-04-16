import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import {
  db,
  getAllMembers,
  getAllDietFiles,
  createDietFileRecord,
  deleteDietFileRecord,
  createUser,
  eliminarImagen,
  getCurrentUser,
  getUser,
  getUserByAuthUid,
  getUserByEmail,
  onAuthChanged,
  subirDocumentoDieta,
  descargarDocumentoDieta
} from '../firebase';
import ModalExito from './modales/ModalExito';
import ErrorModal from './modales/ErrorModal';
import ModalConfirmacion from './modales/ModalConfirmacion';

const allowedTypesLabel = 'PDF, JPG o PNG';
const maxDietFileSizeBytes = 10 * 1024 * 1024;
const maxTitleLength = 120;
const maxNotesLength = 500;
const maxSearchLength = 80;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPermissionDeniedError = (errorMessage = '') => {
  const msg = String(errorMessage || '').toLowerCase();
  return msg.includes('missing or insufficient permissions') || msg.includes('permission-denied');
};

const normalizeSearchText = (value = '') => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const normalizeRole = (roleValue) => String(roleValue || '').toLowerCase().trim();

const normalizeLookupKey = (value) => String(value || '').toLowerCase().trim();

const isNutritionistRole = (roleValue) => {
  const role = normalizeRole(roleValue);
  return ['nutritionist', 'nutriologo', 'nutriologa', 'nutriologo/a', 'nutricionista', 'nutri'].includes(role);
};

const hasPrivilegedRole = (userData) => {
  const role = normalizeRole(userData?.role);
  return [
    'admin',
    'entrenador',
    'trainer',
    'nutritionist',
    'nutriologo',
    'nutriologa',
    'nutriologo/a',
    'nutricionista',
    'nutri'
  ].includes(role);
};

const ensureFirebaseTokenReady = async (user) => {
  if (!user?.uid) return null;
  try {
    await user.getIdToken();
  } catch {
    await user.getIdToken(true);
  }
  return user;
};

const waitForFirebaseUser = () => {
  const currentUser = getCurrentUser();
  if (currentUser?.uid && currentUser?.email) {
    return ensureFirebaseTokenReady(currentUser);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(user || null);
    };

    const unsubscribe = onAuthChanged((user) => {
      if (user?.uid && user?.email) {
        ensureFirebaseTokenReady(user)
          .then((readyUser) => finish(readyUser))
          .catch(() => finish(user));
      }
    });

    const timeoutId = setTimeout(() => {
      finish(getCurrentUser());
    }, 4000);
  });
};

const ensureStaffMirrorUser = async () => {
  const currentUser = await waitForFirebaseUser();
  const currentEmail = String(currentUser?.email || '').trim();
  const normalizedEmail = currentEmail.toLowerCase();

  if (!currentUser?.uid || !currentUser?.email) {
    return { success: false, error: 'Tu sesión de Firebase no está lista. Cierra sesión y vuelve a entrar.' };
  }

  const directUserResult = await getUser(currentUser.uid);
  if (directUserResult.success && hasPrivilegedRole(directUserResult.data)) {
    return { success: true, role: normalizeRole(directUserResult.data?.role) };
  }

  const authUidUserResult = await getUserByAuthUid(currentUser.uid);
  let sourceUser = authUidUserResult.success && hasPrivilegedRole(authUidUserResult.data)
    ? authUidUserResult.data
    : null;

  if (!sourceUser) {
    const emailUserResult = await getUserByEmail(currentEmail);
    const emailUserResultNormalized = !emailUserResult.success && normalizedEmail !== currentEmail
      ? await getUserByEmail(normalizedEmail)
      : emailUserResult;

    if (emailUserResultNormalized.success && hasPrivilegedRole(emailUserResultNormalized.data)) {
      sourceUser = emailUserResultNormalized.data;
    }
  }

  if (!sourceUser) {
    return { success: false, error: 'Tu cuenta no tiene rol de staff autorizado para gestionar dietas.' };
  }

  const staffRole = normalizeRole(sourceUser.role) || 'nutriologo';
  let createResult = await createUser(currentUser.uid, {
    email: currentEmail,
    displayName: sourceUser.displayName || sourceUser.username || currentUser.displayName || currentEmail.split('@')[0],
    username: sourceUser.username || sourceUser.displayName || currentEmail.split('@')[0],
    role: staffRole,
    authUid: currentUser.uid
  });

  if (!createResult.success && isPermissionDeniedError(createResult.error)) {
    await ensureFirebaseTokenReady(currentUser);
    await sleep(350);
    createResult = await createUser(currentUser.uid, {
      email: currentEmail,
      displayName: sourceUser.displayName || sourceUser.username || currentUser.displayName || currentEmail.split('@')[0],
      username: sourceUser.username || sourceUser.displayName || currentEmail.split('@')[0],
      role: staffRole,
      authUid: currentUser.uid
    });
  }

  if (!createResult.success) {
    return { success: false, error: createResult.error || 'No se pudo habilitar el acceso de staff para esta sesión.' };
  }

  await ensureFirebaseTokenReady(currentUser);
  return { success: true, role: staffRole };
};

function DietRepositoryAdmin() {
  const [members, setMembers] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [memberFilter, setMemberFilter] = useState('');
  const [fileFilter, setFileFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [sessionRole, setSessionRole] = useState('');
  const [successModal, setSuccessModal] = useState({ open: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [pendingDeleteFile, setPendingDeleteFile] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setMembers([]);
    setFiles([]);

    const accessResult = await ensureStaffMirrorUser();
    if (!accessResult.success) {
      setErrorModal({ open: true, message: accessResult.error });
      setLoading(false);
      return;
    }

    setSessionRole(normalizeRole(accessResult.role));

    // Asegurar que el token de Firebase está listo
    const currentUser = await waitForFirebaseUser();
    if (currentUser?.uid) {
      await ensureFirebaseTokenReady(currentUser);
    }

    let [membersResult, filesResult] = await Promise.all([
      getAllMembers(),
      getAllDietFiles()
    ]);

    if (isPermissionDeniedError(membersResult?.error) || isPermissionDeniedError(filesResult?.error)) {
      const retryUser = await waitForFirebaseUser();
      if (retryUser?.uid) {
        await ensureFirebaseTokenReady(retryUser);
      }
      await sleep(350);
      [membersResult, filesResult] = await Promise.all([
        getAllMembers(),
        getAllDietFiles()
      ]);
    }

    if (!membersResult.success) {
      setErrorModal({ open: true, message: membersResult.error || 'No se pudieron cargar los pacientes' });
    } else {
      setMembers(membersResult.data || []);
    }

    if (!filesResult.success) {
      setErrorModal({ open: true, message: filesResult.error || 'No se pudieron cargar los archivos' });
    } else {
      setFiles(filesResult.data || []);
    }

    const shouldRestrictToAssignments = isNutritionistRole(accessResult.role);
    if (shouldRestrictToAssignments && membersResult.success && filesResult.success) {
      let assignmentsSnap;
      try {
        assignmentsSnap = await getDocs(collection(db, 'client_nutritionist_assignments'));
      } catch (assignmentError) {
        setMembers([]);
        setFiles([]);
        setErrorModal({
          open: true,
          message: assignmentError?.message || 'No se pudieron validar los pacientes asignados al nutriólogo.'
        });
        setLoading(false);
        return;
      }

      const currentUser = await waitForFirebaseUser();
      const userCandidates = [
        await getUserByAuthUid(currentUser?.uid || ''),
        await getUser(currentUser?.uid || ''),
        currentUser?.email ? await getUserByEmail(currentUser.email, currentUser.uid) : { success: false }
      ];

      const nutritionistKeys = new Set([
        currentUser?.uid,
        currentUser?.email
      ].map(normalizeLookupKey).filter(Boolean));

      userCandidates
        .filter((item) => item?.success && item?.data)
        .forEach((item) => {
          const data = item.data;
          [data.id, data.authUid, data.legacyId, data.email].forEach((key) => {
            const normalized = normalizeLookupKey(key);
            if (normalized) {
              nutritionistKeys.add(normalized);
            }
          });
        });

      const assignedClientKeys = new Set();
      assignmentsSnap.docs.forEach((docSnap) => {
        const assignment = docSnap.data() || {};
        const status = String(assignment.status || 'active').toLowerCase();
        const nutritionistId = normalizeLookupKey(assignment.nutritionistId);
        const nutritionistEmail = normalizeLookupKey(assignment.nutritionistEmail);
        const matchesNutritionist = nutritionistKeys.has(nutritionistId) || nutritionistKeys.has(nutritionistEmail);

        if (!matchesNutritionist || status !== 'active') {
          return;
        }

        [assignment.clientId, assignment.memberId, docSnap.id].forEach((clientKey) => {
          const normalized = normalizeLookupKey(clientKey);
          if (normalized) {
            assignedClientKeys.add(normalized);
          }
        });
      });

      const allMembers = Array.isArray(membersResult.data) ? membersResult.data : [];
      const assignedMembers = allMembers.filter((member) => {
        const memberKeys = [member.id, member.userId, member.authUid, member.email]
          .map(normalizeLookupKey)
          .filter(Boolean);
        return memberKeys.some((key) => assignedClientKeys.has(key));
      });

      const allowedMemberKeys = new Set();
      assignedMembers.forEach((member) => {
        [member.id, member.userId, member.authUid, member.email].forEach((key) => {
          const normalized = normalizeLookupKey(key);
          if (normalized) {
            allowedMemberKeys.add(normalized);
          }
        });
      });

      const allFiles = Array.isArray(filesResult.data) ? filesResult.data : [];
      const assignedFiles = allFiles.filter((fileItem) => {
        const fileKeys = [
          fileItem.memberId,
          fileItem.memberUserId,
          fileItem.memberAuthUid,
          fileItem.memberEmail,
        ].map(normalizeLookupKey).filter(Boolean);
        return fileKeys.some((key) => allowedMemberKeys.has(key));
      });

      setMembers(assignedMembers);
      setFiles(assignedFiles);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const normalizedMembers = useMemo(() => {
    return [...members]
      .map((member) => ({
        ...member,
        fullName: [member.nombre, member.apellido].filter(Boolean).join(' ').trim() || member.email || `Miembro ${member.id}`
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es-MX'));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const search = normalizeSearchText(memberFilter);
    if (!search) return normalizedMembers;

    return normalizedMembers.filter((member) =>
      normalizeSearchText(member.fullName).includes(search) ||
      normalizeSearchText(member.email || '').includes(search) ||
      normalizeSearchText(String(member.userId || '')).includes(search)
    );
  }, [normalizedMembers, memberFilter]);

  const membersById = useMemo(() => {
    const map = new Map();
    normalizedMembers.forEach((member) => {
      map.set(String(member.id), member);
    });
    return map;
  }, [normalizedMembers]);

  const hydratedFiles = useMemo(() => {
    return files.map((file) => {
      const linkedMember = membersById.get(String(file.memberId));
      return {
        ...file,
        resolvedMemberName: file.memberName || linkedMember?.fullName || 'Sin nombre',
        resolvedMemberEmail: file.memberEmail || linkedMember?.email || ''
      };
    });
  }, [files, membersById]);

  const filteredFiles = useMemo(() => {
    const search = normalizeSearchText(fileFilter);
    const shouldSearchAcrossAll = showAllRecent || Boolean(search);

    if (!selectedMemberId && !shouldSearchAcrossAll) return [];

    const baseFiles = (shouldSearchAcrossAll
      ? [...hydratedFiles]
      : hydratedFiles.filter((file) => String(file.memberId) === String(selectedMemberId)))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.updatedAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });

    if (!search) return baseFiles;

    return baseFiles.filter((file) =>
      normalizeSearchText(file.resolvedMemberName || '').includes(search) ||
      normalizeSearchText(file.resolvedMemberEmail || '').includes(search) ||
      normalizeSearchText(file.title || '').includes(search) ||
      normalizeSearchText(file.notes || '').includes(search) ||
      normalizeSearchText(file.originalFileName || '').includes(search)
    );
  }, [hydratedFiles, fileFilter, selectedMemberId, showAllRecent]);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setSelectedFile(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > maxDietFileSizeBytes) {
      event.target.value = '';
      setSelectedFile(null);
      setErrorModal({ open: true, message: 'El archivo supera el limite de 10 MB. Selecciona un PDF, JPG o PNG de maximo 10 MB.' });
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedMemberId) {
      setErrorModal({ open: true, message: 'Selecciona un paciente antes de subir el archivo' });
      return;
    }

    if (!selectedFile) {
      setErrorModal({ open: true, message: 'Selecciona un archivo para continuar' });
      return;
    }

    const selectedMember = normalizedMembers.find((member) => String(member.id) === String(selectedMemberId));
    if (!selectedMember) {
      setErrorModal({ open: true, message: 'No se encontró la información del paciente seleccionado' });
      return;
    }

    const safeTitle = (title.trim() || selectedFile.name || 'archivo').slice(0, maxTitleLength);
    const safeNotes = notes.trim().slice(0, maxNotesLength);

    setSaving(true);

    const accessResult = await ensureStaffMirrorUser();
    if (!accessResult.success) {
      setSaving(false);
      setErrorModal({ open: true, message: accessResult.error });
      return;
    }

    const uploadResult = await subirDocumentoDieta(selectedFile, selectedMemberId);
    if (!uploadResult.success) {
      setSaving(false);
      setErrorModal({ open: true, message: uploadResult.error || 'No se pudo subir el archivo' });
      return;
    }

    const currentStaff = JSON.parse(localStorage.getItem('firebaseUser') || '{}');
    const recordResult = await createDietFileRecord({
      memberId: String(selectedMemberId),
      memberName: selectedMember.fullName,
      memberEmail: selectedMember.email || '',
      memberUserId: selectedMember.userId || '',
      title: safeTitle,
      notes: safeNotes,
      originalFileName: uploadResult.fileName,
      contentType: uploadResult.contentType,
      size: uploadResult.size,
      storagePath: uploadResult.path,
      downloadURL: uploadResult.url,
      uploadedBy: currentStaff.email || accessResult.role || 'staff'
    });

    if (!recordResult.success) {
      await eliminarImagen(uploadResult.path);
      setSaving(false);
      setErrorModal({ open: true, message: recordResult.error || 'No se pudo guardar el registro del archivo' });
      return;
    }

    await loadData();
    resetForm();
    setSaving(false);
    setSuccessModal({ open: true, title: 'Archivo guardado', message: 'Archivo agregado correctamente al expediente del paciente' });
  };

  const handleDownload = async (fileItem) => {
    const result = await descargarDocumentoDieta(
      fileItem.storagePath,
      fileItem.originalFileName || fileItem.title || 'archivo',
      fileItem.downloadURL || ''
    );
    if (!result.success) {
      setErrorModal({ open: true, message: result.error || 'No se pudo descargar automáticamente. Verifica la conexión y vuelve a intentar.' });
    }
  };

  const handleDelete = async (fileItem) => {
    setSaving(true);

    const deleteRecordResult = await deleteDietFileRecord(fileItem.id);
    if (!deleteRecordResult.success) {
      setSaving(false);
      setErrorModal({ open: true, message: deleteRecordResult.error || 'No se pudo eliminar el registro' });
      return;
    }

    if (fileItem.storagePath) {
      await eliminarImagen(fileItem.storagePath);
    }

    await loadData();
    setSaving(false);
    setPendingDeleteFile(null);
    setSuccessModal({ open: true, title: 'Archivo eliminado', message: 'Archivo eliminado correctamente' });
  };

  const requestDelete = (fileItem) => {
    setPendingDeleteFile(fileItem);
  };

  const handleSelectMember = (memberId) => {
    const nextId = String(memberId || '');
    setSelectedMemberId((currentId) => (String(currentId) === nextId ? '' : nextId));
  };

  const handleClearSelectedMember = () => {
    setSelectedMemberId('');
    setShowAllRecent(false);
    setFileFilter('');
    requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClearSelectedMember();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-850 to-slate-900 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Repositorio Digital de Dietas</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Pacientes</p>
              <p className="mt-1 text-2xl font-bold text-white">{members.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-200">Archivos</p>
              <p className="mt-1 text-2xl font-bold text-white">{files.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Seleccionar Paciente</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{filteredMembers.length} resultados</span>
              </div>
            </div>
            <input
              type="text"
              value={memberFilter}
              maxLength={maxSearchLength}
              onChange={(event) => setMemberFilter(event.target.value.slice(0, maxSearchLength))}
              placeholder="Buscar por nombre, correo o ID..."
              className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
            />

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {loading && (
                <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
                  Cargando pacientes asignados...
                </p>
              )}

              {!loading && filteredMembers.map((member) => {
                const isSelected = String(selectedMemberId) === String(member.id);
                const memberFileCount = files.filter((file) => String(file.memberId) === String(member.id)).length;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectMember(member.id);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-950/30'
                        : 'border-slate-700 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-800'
                    } focus:outline-none focus:ring-0`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{member.fullName}</p>
                        <p className="mt-1 text-xs text-slate-400">{member.email || 'Sin correo registrado'}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Expediente #{member.id}</p>
                      </div>
                      <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200">{memberFileCount}</span>
                    </div>
                  </button>
                );
              })}

              {!loading && filteredMembers.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
                  No hay pacientes que coincidan con la búsqueda.
                </p>
              )}

            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Subir Archivo al Expediente</h2>
            <p className="mt-1 text-sm text-slate-400">Formatos permitidos: {allowedTypesLabel}. Tamaño máximo: 10MB.</p>

            <div className="mt-4 space-y-4">
              <input
                type="text"
                value={title}
                maxLength={maxTitleLength}
                onChange={(event) => setTitle(event.target.value.slice(0, maxTitleLength))}
                placeholder="Título del archivo o plan alimenticio"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              />

              <textarea
                value={notes}
                maxLength={maxNotesLength}
                onChange={(event) => setNotes(event.target.value.slice(0, maxNotesLength))}
                placeholder="Notas opcionales para el expediente"
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              />

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600 bg-slate-950/80 px-4 py-6 text-center transition hover:border-cyan-500 hover:bg-slate-950">
                <span className="text-sm font-medium text-white">Seleccionar archivo</span>
                <span className="mt-1 text-xs text-slate-400">{selectedFile ? `${selectedFile.name} • ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Haz clic para elegir PDF, JPG o PNG'}</span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving || loading}
              className="mt-5 w-full rounded-2xl bg-linear-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Guardando archivo...' : 'Guardar en expediente'}
            </button>
          </form>
        </div>

        <div className="self-start rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Archivos Registrados</h2>
              <p className="text-sm text-slate-400">
                {showAllRecent
                  ? (isNutritionistRole(sessionRole)
                    ? 'Archivos más recientes de tus pacientes asignados.'
                    : 'Archivos más recientes de todos los pacientes.')
                  : 'Consulta y descarga los archivos del expediente digital.'}
              </p>
            </div>
            <div className="flex gap-2 lg:items-center">
              <button
                type="button"
                onClick={() => setShowAllRecent(!showAllRecent)}
                className={`whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  showAllRecent
                    ? 'border border-cyan-500 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                    : 'border border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-600'
                }`}
              >
                {showAllRecent ? '← Volver' : 'Ver recientes'}
              </button>
              <input
                type="text"
                value={fileFilter}
                maxLength={maxSearchLength}
                onChange={(event) => setFileFilter(event.target.value.slice(0, maxSearchLength))}
                placeholder="Buscar archivo o paciente..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 lg:w-auto lg:min-w-xs"
              />
            </div>
          </div>

          {loading ? (
            <p className="py-4 text-center text-slate-400">Cargando repositorio...</p>
          ) : !showAllRecent && !selectedMemberId && !fileFilter.trim() ? (
            <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-center text-sm text-slate-400">
              Selecciona un paciente para ver sus archivos.
            </p>
          ) : filteredFiles.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-center text-sm text-slate-400">
              No hay archivos registrados {showAllRecent ? 'recientemente' : 'con los filtros actuales'}.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredFiles.map((fileItem) => {
                const date = fileItem.createdAt?.toDate?.() || fileItem.updatedAt?.toDate?.() || null;

                return (
                  <div key={fileItem.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-all text-base font-semibold text-white">{fileItem.title || fileItem.originalFileName}</h3>
                          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] uppercase tracking-wide text-cyan-300">
                            {fileItem.contentType === 'application/pdf' ? 'PDF' : 'Imagen'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">Paciente: {fileItem.resolvedMemberName || 'Sin nombre'}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">{fileItem.originalFileName}</p>
                        {fileItem.notes && <p className="mt-3 wrap-break-word text-sm text-slate-400">{fileItem.notes}</p>}
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Subido por: {fileItem.uploadedBy || 'admin'}</span>
                          <span>{date ? date.toLocaleString('es-MX') : 'Sin fecha'}</span>
                          <span>{fileItem.size ? `${(fileItem.size / 1024 / 1024).toFixed(2)} MB` : 'Tamaño no disponible'}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <a
                          href={fileItem.downloadURL}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                        >
                          Abrir
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownload(fileItem)}
                          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                        >
                          Descargar
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(fileItem)}
                          disabled={saving}
                          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {successModal.open && (
        <ModalExito
          isOpen={successModal.open}
          title={successModal.title}
          message={successModal.message}
          onClose={() => setSuccessModal({ open: false, title: '', message: '' })}
        />
      )}

      {errorModal.open && (
        <ErrorModal
          isOpen={errorModal.open}
          title="No se pudo completar la acción"
          message={errorModal.message}
          onClose={() => setErrorModal({ open: false, message: '' })}
        />
      )}

      {pendingDeleteFile && (
        <ModalConfirmacion
          isOpen={Boolean(pendingDeleteFile)}
          title="Confirmar eliminación"
          message={`¿Eliminar "${(pendingDeleteFile.title || pendingDeleteFile.originalFileName || 'archivo').slice(0, 35)}${(pendingDeleteFile.title || pendingDeleteFile.originalFileName || 'archivo').length > 35 ? '...' : ''}" del expediente?`}
          onClose={() => setPendingDeleteFile(null)}
          onConfirm={() => handleDelete(pendingDeleteFile)}
        />
      )}
    </div>
  );
}

export default DietRepositoryAdmin;
