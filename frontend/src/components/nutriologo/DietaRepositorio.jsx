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
} from '../../firebase';
import ModalExito from '../modales/ModalExito';
import ErrorModal from '../modales/ErrorModal';
import ModalConfirmacion from '../modales/ModalConfirmacion';
import ListaPacientes from './ListaPacientes';
import FormularioSubirDieta from './FormularioSubirDieta';
import ListaArchivosDieta from './ListaArchivosDieta';

const allowedTypesLabel = 'PDF, JPG o PNG';
const maxDietFileSizeBytes = 10 * 1024 * 1024;
const maxTitleLength = 120;
const maxNotesLength = 500;

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
    <div className="mx-auto mt-4 max-w-7xl overflow-hidden rounded-2xl border border-slate-700 bg-gray-800 shadow-2xl relative">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-purple-600 via-blue-400 to-cyan-400 z-10" />

      <div className="relative z-10 space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-850 to-slate-900 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl text-cyan-500 font-bold ">Repositorio Digital de Dietas</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Pacientes</p>
              <p className="mt-1 text-2xl font-bold text-white">{loading ? '...' : members.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-200">Archivos</p>
              <p className="mt-1 text-2xl font-bold text-white">{loading ? '...' : files.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
        <div className="space-y-6">
          <ListaPacientes
            loading={loading}
            filteredMembers={filteredMembers}
            memberFilter={memberFilter}
            setMemberFilter={setMemberFilter}
            selectedMemberId={selectedMemberId}
            handleSelectMember={handleSelectMember}
            files={files}
          />
          <FormularioSubirDieta
            handleSubmit={handleSubmit}
            title={title}
            setTitle={setTitle}
            notes={notes}
            setNotes={setNotes}
            selectedFile={selectedFile}
            handleFileChange={handleFileChange}
            saving={saving}
            loading={loading}
          />
        </div>

        <ListaArchivosDieta
          loading={loading}
          sessionRole={sessionRole}
          showAllRecent={showAllRecent}
          setShowAllRecent={setShowAllRecent}
          fileFilter={fileFilter}
          setFileFilter={setFileFilter}
          selectedMemberId={selectedMemberId}
          filteredFiles={filteredFiles}
          handleDownload={handleDownload}
          requestDelete={requestDelete}
          saving={saving}
        />
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
    </div>
  );
}

export default DietRepositoryAdmin;
