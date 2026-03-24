import React from 'react';

export default function FormStatusMessages({
    successMessage,
    warningMessage,
    errors,
    isLoadingRoutine,
}) {
    return (
        <>
            {isLoadingRoutine && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-300">
                    Cargando rutina existente del alumno...
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-950 border border-emerald-700 rounded-2xl px-4 py-3 text-sm text-emerald-300">
                    {successMessage}
                </div>
            )}

            {warningMessage && (
                <div className="bg-amber-950 border border-amber-700 rounded-2xl px-4 py-3 text-sm text-amber-200">
                    {warningMessage}
                </div>
            )}

            {(errors.save || errors.delete) && (
                <div className="bg-red-950 border border-red-700 rounded-2xl px-4 py-3 text-sm text-red-300">
                    {errors.save || errors.delete}
                </div>
            )}
        </>
    );
}
