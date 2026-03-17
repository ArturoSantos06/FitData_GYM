import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAllMembers, 
  createTrainerNote, 
  getTrainerNotesByMember, 
  updateTrainerNote, 
  deleteTrainerNote,
  getCurrentUser 
} from '../firebase';

function BitacoraEntrenador({ embedded = false }) {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentTrainer, setCurrentTrainer] = useState(null);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  }, []);

  const loadCurrentTrainer = useCallback(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentTrainer({
        uid: user.uid,
        email: user.email
      });
    }
  }, []);

  const loadMembers = useCallback(async () => {
    const result = await getAllMembers();
    if (result.success) {
      setMembers(result.data);
    } else {
      showMessage('error', 'Error al cargar miembros');
    }
  }, [showMessage]);

  useEffect(() => {
    setTimeout(() => {
      loadMembers();
      loadCurrentTrainer();
    }, 0);
  }, [loadMembers, loadCurrentTrainer]);

  const loadNotes = async (memberId) => {
    setLoading(true);
    const result = await getTrainerNotesByMember(memberId);
    if (result.success) {
      setNotes(result.data);
    } else {
      showMessage('error', 'Error al cargar notas');
    }
    setLoading(false);
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setNoteText('');
    setEditingNote(null);
    loadNotes(member.id);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) {
      showMessage('error', 'La nota no puede estar vacía');
      return;
    }

    const noteData = {
      memberId: selectedMember.id,
      memberName: selectedMember.nombre,
      note: noteText,
      createdBy: currentTrainer?.uid || 'unknown',
      trainerEmail: currentTrainer?.email || 'unknown'
    };

    let result;
    if (editingNote) {
      result = await updateTrainerNote(editingNote.id, { note: noteText });
      if (result.success) {
        showMessage('success', '✅ Nota actualizada correctamente');
      }
    } else {
      result = await createTrainerNote(noteData);
      if (result.success) {
        showMessage('success', '✅ Nota guardada correctamente');
      }
    }

    if (result.success) {
      setNoteText('');
      setEditingNote(null);
      loadNotes(selectedMember.id);
    } else {
      showMessage('error', 'Error al guardar la nota');
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteText(note.note);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta nota?')) return;

    const result = await deleteTrainerNote(noteId);
    if (result.success) {
      showMessage('success', '🗑️ Nota eliminada');
      loadNotes(selectedMember.id);
    } else {
      showMessage('error', 'Error al eliminar la nota');
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteText('');
  };

  const filteredMembers = members.filter(m => 
    m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Sin fecha';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-slate-950 p-4 md:p-8"}>
      
      {/* CAJA PRINCIPAL UNIFICADA  */}
      <div className={`bg-gray-800 p-6 rounded-xl shadow-xl border-t-4 border-purple-500 text-gray-100 font-sans max-w-[1400px] mx-auto ${!embedded && 'mt-6'}`}>
        
        <header className="mb-8 border-b border-gray-700 pb-5">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent pb-1.5 flex items-center gap-3">
              📝 Bitácora de Notas
            </h1>
            <p className="text-slate-400 font-medium mt-1.5">Sistema de seguimiento técnico - Uso exclusivo de entrenadores</p>
          </div>
        </header>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border font-bold ${
            message.type === 'success' 
              ? 'bg-green-900/20 border-green-500 text-green-400' 
              : 'bg-red-900/20 border-red-500 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA: LISTA DE CLIENTES */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-full">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">👥</span> Clientes
              </h2>
              
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none mb-4 transition-colors"
              />

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2">
                {filteredMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
                      selectedMember?.id === member.id
                        ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-[1.02] border-transparent'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-purple-500/50 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-bold">{member.nombre}</p>
                    <p className={`text-xs ${selectedMember?.id === member.id ? 'text-purple-200' : 'text-slate-500'}`}>
                      {member.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: NOTAS DEL CLIENTE */}
          <div className="lg:col-span-2">
            {selectedMember ? (
              <div className="space-y-6">
                
                {/* TARJETA DE RESUMEN DEL CLIENTE  */}
                <div className="bg-linear-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-6 shadow-xl flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{selectedMember.nombre}</h2>
                    <p className="text-slate-300 text-sm">{selectedMember.email}</p>
                    {selectedMember.telefono && (
                      <p className="text-slate-400 text-sm mt-1">📞 {selectedMember.telefono}</p>
                    )}
                  </div>
                  <div className="bg-black/20 rounded-lg px-6 py-3 border border-white/10 shadow-inner">
                    <p className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">Total Notas</p>
                    <p className="text-3xl font-black text-white text-center">{notes.length}</p>
                  </div>
                </div>

                {/* FORMULARIO DE NUEVA NOTA */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
                  <form onSubmit={handleSaveNote}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {editingNote ? '✏️ Editar Nota' : '➕ Nueva Observación'}
                      </h3>
                      {editingNote && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
                        >
                          ❌ Cancelar Edición
                        </button>
                      )}
                    </div>

                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Escribe tus observaciones técnicas aquí..."
                      className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 outline-none min-h-[120px] resize-y transition-colors"
                      required
                    />

                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-purple-900/50 flex items-center gap-2 transform hover:scale-105"
                      >
                        {editingNote ? '💾 Actualizar Nota' : '💾 Guardar Nota'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* HISTORIAL DE NOTAS */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-3">
                    <span>📋</span> Historial de Notas
                  </h3>

                  {loading ? (
                    <div className="text-center py-8 text-slate-400">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="mt-4 font-medium">Cargando notas...</p>
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950 rounded-lg border border-dashed border-purple-900/50">
                      <p className="text-4xl mb-3 opacity-50">📝</p>
                      <p className="text-slate-300 font-bold">Sin registros previos</p>
                      <p className="text-sm text-slate-500 mt-1">Agrega la primera observación usando el formulario de arriba.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                      {notes.map(note => (
                        <div
                          key={note.id}
                          className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-purple-500/50 transition-colors shadow-md"
                        >
                          <div className="flex justify-between items-start mb-4 border-b border-slate-700/50 pb-3">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-purple-400 mb-1 tracking-wider uppercase">
                                📅 {formatDate(note.createdAt)}
                                {note.updatedAt && note.updatedAt !== note.createdAt && (
                                  <span className="ml-2 text-slate-500 normal-case font-normal">(Editado: {formatDate(note.updatedAt)})</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 font-medium">
                                👤 Por: <span className="text-slate-300">{note.trainerEmail || 'Entrenador'}</span>
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleEditNote(note)}
                                className="text-slate-400 hover:text-blue-400 transition-colors"
                                title="Editar nota"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-slate-400 hover:text-pink-400 transition-colors"
                                title="Eliminar nota"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">{note.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              // PANTALLA VACÍA CUANDO NO HAY CLIENTE SELECCIONADO
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-12 shadow-xl text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-6xl mb-6 opacity-80">👈</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Selecciona un Cliente
                </h3>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Selecciona un cliente de la lista lateral para ver y gestionar sus notas privadas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BitacoraEntrenador;