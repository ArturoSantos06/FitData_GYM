import React, { useM}
import { navigate } from 'react-router-dom'

<p
  onDoubleClick={() =>
    navigate(`/entrenador/rutina/${member.id}`, {
      state: { member }
    })
  }
  className="text-white font-semibold cursor-pointer select-none hover:text-blue-400 transition-colors"
  title="Doble clic para abrir rutina"
>
  {fullName || 'Sin nombre registrado'}
</p>
<p className="text-slate-500 text-xs mt-1">Doble clic en el nombre para crear rutina</p>