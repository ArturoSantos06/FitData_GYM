import React, { useState } from 'react';

const ComentariosCliente = () => {
  const [newMessage, setNewMessage] = useState('');

  const messages = [
    {
      id: 1,
      text: '¡Hola! ¿Cómo te sentiste con la rutina y dieta de esta semana?',
      senderId: 'nutri_123',
      timestamp: '10:00 AM',
      status: 'read'
    },
    {
      id: 2,
      text: 'Todo muy bien, pero me quedo con un poco de hambre en las noches.',
      senderId: 'cliente_actual',
      timestamp: '10:15 AM',
      status: 'read'
    },
    {
      id: 3,
      text: 'Anotado. Vamos a ajustar tus macros de la cena. ¿Te parece si agregamos más proteína?',
      senderId: 'nutri_123',
      timestamp: '10:20 AM',
      status: 'read'
    },
    {
      id: 4,
      text: 'Me parece perfecto, gracias.',
      senderId: 'cliente_actual',
      timestamp: '10:22 AM',
      status: 'delivered'
    },
    {
      id: 5,
      text: 'Un mensaje que acaba de salir...',
      senderId: 'cliente_actual',
      timestamp: '10:25 AM',
      status: 'sent'
    }
  ];

  const currentClientId = 'cliente_actual';

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setNewMessage('');
  };
  const renderStatus = (status) => {
    switch (status) {
      case 'sent':
        return <span className="text-gray-400 ml-1 text-xs">✓</span>;
      case 'delivered':
        return <span className="text-gray-400 ml-1 text-xs">✓✓</span>;
      case 'read':
        return <span className="text-cyan-400 ml-1 text-xs drop-shadow-[0_0_2px_rgba(6,182,212,0.8)]">✓✓</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100 font-sans">

      <header className="px-6 py-4 bg-gray-900 border-b border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] flex items-center justify-center text-cyan-400 font-bold">
            N
          </div>
          <div>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-cyan-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]">
              Nutriólogo Asignado
            </h1>
            <p className="text-xs text-cyan-500">En línea</p>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black scrollbar-thin scrollbar-thumb-purple-700 scrollbar-track-gray-900">
        {messages.map((msg) => {
          const isClient = msg.senderId === currentClientId;

          return (
            <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2 relative flex flex-col gap-1 ${isClient
                  ? 'bg-purple-900/40 border border-purple-500/70 text-purple-50 rounded-bl-2xl rounded-tl-2xl rounded-tr-md shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-cyan-900/30 border border-cyan-500/70 text-cyan-50 rounded-br-2xl rounded-tr-2xl rounded-tl-md shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className="flex items-center justify-end gap-1">
                  <span className={`text-[10px] ${isClient ? 'text-purple-300' : 'text-cyan-300'}`}>
                    {msg.timestamp}
                  </span>
                  {isClient && renderStatus(msg.status)}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="p-4 bg-gray-900 border-t border-cyan-500 shadow-[0_0_-15px_rgba(6,182,212,0.3)] z-10">
        <form onSubmit={handleSendMessage} className="flex gap-3 max-w-5xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-950 text-cyan-50 px-4 py-3 rounded-md border border-gray-700 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all placeholder-gray-600"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600/80 hover:bg-purple-500 text-white font-semibold rounded-md border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.6)] hover:shadow-[0_0_20px_rgba(168,85,247,0.8)] transition-all flex items-center justify-center"
          >
            Enviar
          </button>
        </form>
      </footer>

    </div>
  );
};

export default ComentariosCliente;