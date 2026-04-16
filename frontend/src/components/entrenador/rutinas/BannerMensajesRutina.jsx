import React from 'react';

function BannerMensajesRutina({ formSuccessMessage, formWarningMessage, formErrors, isLoadingRoutine }) {
  return (
    <>
      {formSuccessMessage && (
        <div className="bg-emerald-950 border border-emerald-700 rounded-2xl px-4 py-3 text-sm text-emerald-300">
          {formSuccessMessage}
        </div>
      )}
      {formWarningMessage && (
        <div className="bg-amber-950 border border-amber-700 rounded-2xl px-4 py-3 text-sm text-amber-200">
          {formWarningMessage}
        </div>
      )}
      {(formErrors.save || formErrors.delete) && (
        <div className="bg-red-950 border border-red-700 rounded-2xl px-4 py-3 text-sm text-red-300">
          {formErrors.save || formErrors.delete}
        </div>
      )}
      {isLoadingRoutine && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-300">
          Cargando rutina existente del alumno...
        </div>
      )}
    </>
  );
}

export default BannerMensajesRutina;
