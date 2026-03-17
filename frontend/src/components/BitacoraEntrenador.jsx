import React, { useState, useEffect } from 'react';
import { 
  getAllMembers, 
  createTrainerNote, 
  getTrainerNotesByMember, 
  updateTrainerNote, 
  deleteTrainerNote,
  getCurrentUser 
} from '../firebase';

function BitacoraEntrenador() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentTrainer, setCurrentTrainer] = useState(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const loadCurrentTrainer = () => {
    const user = getCurrentUser();
    if (user) {
      setCurrentTrainer({
        uid: user.uid,
        email: user.email
      });
    }
  };

  const loadMembers = async () => {
    const result = await getAllMembers();
    if (result.success) {
      setMembers(result.data);
    } else {
      showMessage('error', 'Error al cargar miembros');
    }
  };

  useEffect(() => {
    setTimeout(() => {
      loadMembers();
      loadCurrentTrainer();
    }, 0);
  }, []);

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
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return;

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
    <div className="w-full min-h-screen bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
            📝 Bitácora de Notas
          </h1>
          <p className="text-slate-400">Sistema de seguimiento técnico - Uso exclusivo de entrenadores</p>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-900/20 border-green-500 text-green-400' 
              : 'bg-red-900/20 border-red-500 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">👥</span>
                Clientes
              </h2>
              
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none mb-4"
              />

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                {filteredMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedMember?.id === member.id
                        ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105'
                        : 'bg-slate-900/50 border border-slate-700 text-slate-300 hover:border-purple-500 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-medium">{member.nombre}</p>
                    <p className="text-xs opacity-70">{member.email}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedMember ? (
              <div className="space-y-6">
                <div className="bg-linear-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{selectedMember.nombre}</h2>
                      <p className="text-slate-300 text-sm">{selectedMember.email}</p>
                      {selectedMember.telefono && (
                        <p className="text-slate-400 text-sm">📞 {selectedMember.telefono}</p>
                      )}
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                      <p className="text-xs text-slate-300">Total de notas</p>
                      <p className="text-2xl font-bold text-white text-center">{notes.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                  <form onSubmit={handleSaveNote}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        {editingNote ? '✏️ Editar Nota' : '➕ Nueva Observación'}
                      </h3>
                      {editingNote && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                          ❌ Cancelar
                        </button>
                      )}
                    </div>

                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Escribe tus observaciones técnicas aquí..."
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 outline-none min-h-[120px] resize-y"
                      required
                    />

                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/50 transform hover:scale-105"
                      >
                        {editingNote ? '💾 Actualizar Nota' : '💾 Guardar Nota'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Historial de Notas */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📋</span>
                    Historial de Notas
                  </h3>

                  {loading ? (
                    <div className="text-center py-8 text-slate-400">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="mt-4">Cargando notas...</p>
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-4xl mb-2">📝</p>
                      <p>No hay notas registradas para este cliente</p>
                      <p className="text-sm mt-2">Agrega la primera observación usando el formulario de arriba</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {notes.map(note => (
                        <div
                          key={note.id}
                          className="bg-slate-900/70 border border-slate-600 rounded-lg p-4 hover:border-purple-500 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="text-xs text-slate-400 mb-1">
                                📅 {formatDate(note.createdAt)}
                                {note.updatedAt && note.updatedAt !== note.createdAt && (
                                  <span className="ml-2 text-blue-400">(editado: {formatDate(note.updatedAt)})</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                👤 Por: {note.trainerEmail || 'Entrenador'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditNote(note)}
                                className="text-blue-400 hover:text-blue-300 transition-colors p-2"
                                title="Editar nota"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-red-400 hover:text-red-300 transition-colors p-2"
                                title="Eliminar nota"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <p className="text-white whitespace-pre-wrap leading-relaxed">{note.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 shadow-xl text-center">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    Selecciona un Cliente
                  </h3>
                  <p className="text-slate-400">
                    Selecciona un cliente de la lista para ver y gestionar sus notas privadas
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    
    </div>
  );
}

export default BitacoraEntrenador;

//http://localhost:5173/admin/bitacora