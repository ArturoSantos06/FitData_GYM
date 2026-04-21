import React from 'react';
import { Bot, Dumbbell, Loader2, MessageCircle, Send, Sparkles, Wrench, User, Stethoscope, ChevronRight, ChevronLeft } from 'lucide-react';

import VentanaChat from './VentanaChat';
import CentroNotificaciones from './CentroNotificaciones';
import FormularioReporteEnChat from '../mantenimiento/FormularioReporteEnChat';
import {
    GOAL_OPTIONS,
    LEVEL_OPTIONS,
    TIME_OPTIONS,
    DAYS_PER_WEEK_OPTIONS,
    formatBubbleTime,
    sanitizeDaysPerWeekInput,
} from '../../backend/SoporteWhatsAppHelpers';

function ChatBubble({ role, text, time, pending = false }) {
    const isUser = role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`max-w-[88%] md:max-w-[72%] rounded-xl px-3 py-2 shadow-sm ${isUser
                    ? 'bg-blue-700/80 text-blue-50 rounded-br-sm border border-blue-600/30'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-300/60'
                    }`}
            >
                <p className="whitespace-pre-wrap text-sm leading-5">{text}</p>
                <div className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${isUser ? 'text-blue-200/80' : 'text-slate-500'}`}>
                    {pending && <Loader2 size={11} className="animate-spin" />}
                    <span>{time}</span>
                </div>
            </div>
        </div>
    );
}

function SoporteWhatsAppPanel({
    activeChat,
    setActiveChat,
    showSidebarMobile,
    setShowSidebarMobile,
    currentUser,
    trainerId,
    trainerName,
    nutritionistId,
    nutritionistName,
    aiPreview,
    supportPreview,
    maintenancePreview,
    getUnifiedChatId,
    aiSettings,
    setAiSettings,
    chatBodyRef,
    aiHistoryLoading,
    aiMessages,
    displayedMessages,
    quickQuestions,
    handleSupportQuickQuestion,
    catalogoError,
    aiHistoryError,
    aiSendError,
    catalogoMaquinas,
    handleReportCreated,
    handleSend,
    EntradaMensaje,
    setEntradaMensaje,
    isGenerating,
}) {
    return (
        <div className="w-full animate-fade-in">
            <div className="mx-auto h-[calc(100dvh-9rem)] md:h-[calc(100vh-12rem)] min-h-[520px] max-h-[840px] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-700 bg-gray-800 shadow-2xl relative">

                {/* Barra de color superior al estilo VistaPlan */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 via-cyan-400 to-emerald-400 z-10" />

                <div className="flex h-full min-h-0 flex-col md:flex-row pt-1.5">

                    {/* Sidebar */}
                    <aside className={`w-full min-h-0 border-b border-slate-700 bg-gray-800 md:w-[300px] md:border-b-0 md:border-r flex-col ${showSidebarMobile ? 'flex' : 'hidden md:flex'}`}>
                        <div className="border-b border-slate-700 px-4 py-3 flex items-center justify-between bg-slate-900/40">
                            <div>
                                <h2 className="text-base font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300">Mensajes</h2>
                                <p className="text-xs text-slate-400">Tus conversaciones</p>
                            </div>
                            {currentUser && <CentroNotificaciones userId={currentUser.uid} onNotificationClick={(n) => {
                                if (n.senderId === trainerId) {
                                    setActiveChat('entrenador');
                                } else if (n.senderId === nutritionistId) {
                                    setActiveChat('nutriologo');
                                }
                            }} />}
                        </div>

                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-20 pt-3 md:pb-3">
                            {/* Botón Entrenador */}
                            {trainerId && (
                                <button
                                    type="button"
                                    onClick={() => { setActiveChat('entrenador'); setShowSidebarMobile(false); }}
                                    className={`w-full bg-slate-900 border rounded-xl p-4 flex items-center justify-between group transition-all duration-300 shadow-md text-left
                                        ${activeChat === 'entrenador'
                                            ? 'border-blue-500/60 bg-blue-500/5'
                                            : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl transition-all shadow-inner ${activeChat === 'entrenador' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white'}`}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-blue-300">Entrenador</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[140px]">{trainerName}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                </button>
                            )}

                            {/* Botón Nutriólogo */}
                            {nutritionistId && (
                                <button
                                    type="button"
                                    onClick={() => { setActiveChat('nutriologo'); setShowSidebarMobile(false); }}
                                    className={`w-full bg-slate-900 border rounded-xl p-4 flex items-center justify-between group transition-all duration-300 shadow-md text-left
                                        ${activeChat === 'nutriologo'
                                            ? 'border-emerald-500/60 bg-emerald-500/5'
                                            : 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl transition-all shadow-inner ${activeChat === 'nutriologo' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                                            <Stethoscope size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-300">Nutriólogo</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[140px]">{nutritionistName}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                </button>
                            )}

                            {/* Botón IA */}
                            <button
                                type="button"
                                onClick={() => { setActiveChat('ia'); setShowSidebarMobile(false); }}
                                className={`w-full bg-slate-900 border rounded-xl p-4 flex items-center justify-between group transition-all duration-300 shadow-md text-left
                                    ${activeChat === 'ia'
                                        ? 'border-cyan-500/60 bg-cyan-500/5'
                                        : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl transition-all shadow-inner ${activeChat === 'ia' ? 'bg-cyan-500 text-white' : 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white'}`}>
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-cyan-300">IA de Rutinas</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[140px]">{aiPreview}</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                            </button>

                            {/* Botón Soporte */}
                            <button
                                type="button"
                                onClick={() => { setActiveChat('soporte'); setShowSidebarMobile(false); }}
                                className={`w-full bg-slate-900 border rounded-xl p-4 flex items-center justify-between group transition-all duration-300 shadow-md text-left
                                    ${activeChat === 'soporte'
                                        ? 'border-violet-500/60 bg-violet-500/5'
                                        : 'border-slate-700 hover:border-violet-500/50 hover:bg-slate-800'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl transition-all shadow-inner ${activeChat === 'soporte' ? 'bg-violet-500 text-white' : 'bg-violet-500/10 text-violet-400 group-hover:bg-violet-500 group-hover:text-white'}`}>
                                        <MessageCircle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-violet-300">Ayuda FitData</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[140px]">{supportPreview}</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-500 group-hover:text-violet-400 transition-colors" />
                            </button>

                            {/* Botón Mantenimiento */}
                            <button
                                type="button"
                                onClick={() => { setActiveChat('mantenimiento'); setShowSidebarMobile(false); }}
                                className={`w-full bg-slate-900 border rounded-xl p-4 flex items-center justify-between group transition-all duration-300 shadow-md text-left
                                    ${activeChat === 'mantenimiento'
                                        ? 'border-amber-500/60 bg-amber-500/5'
                                        : 'border-slate-700 hover:border-amber-500/50 hover:bg-slate-800'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-xl transition-all shadow-inner ${activeChat === 'mantenimiento' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white'}`}>
                                        <Wrench size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-300">Reporte de Máquinas</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[140px]">{maintenancePreview}</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                            </button>
                        </div>
                    </aside>

                    {/* Panel principal */}
                    {activeChat === 'entrenador' ? (
                        <div className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                            <VentanaChat
                                chatId={getUnifiedChatId(currentUser?.uid, trainerId)}
                                currentUserId={currentUser?.uid}
                                title={trainerName}
                                subtitle="Entrenador Asignado"
                                onBack={() => setShowSidebarMobile(true)}
                            />
                        </div>
                    ) : activeChat === 'nutriologo' ? (
                        <div className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                            <VentanaChat
                                chatId={getUnifiedChatId(currentUser?.uid, nutritionistId)}
                                currentUserId={currentUser?.uid}
                                title={nutritionistName}
                                subtitle="Nutriólogo Asignado"
                                onBack={() => setShowSidebarMobile(true)}
                            />
                        </div>
                    ) : (
                        <section className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                            <header className="border-b border-slate-700 bg-slate-900/60 px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowSidebarMobile(true)}
                                        className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors shrink-0"
                                        aria-label="Volver a conversaciones"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>

                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 rounded-xl ${activeChat === 'ia' ? 'bg-cyan-500/20 text-cyan-300' : activeChat === 'mantenimiento' ? 'bg-amber-500/20 text-amber-300' : 'bg-violet-500/20 text-violet-300'}`}>
                                            {activeChat === 'ia' ? <Bot size={18} /> : activeChat === 'mantenimiento' ? <Wrench size={18} /> : <MessageCircle size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-bold truncate ${activeChat === 'ia' ? 'text-cyan-300' : activeChat === 'mantenimiento' ? 'text-amber-300' : 'text-violet-300'}`}>
                                                {activeChat === 'ia' ? 'Entrenador IA' : activeChat === 'mantenimiento' ? 'Reporte de Máquinas' : 'Ayuda y Soporte'}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">
                                                {activeChat === 'ia' ? 'Rutinas personalizadas en tiempo real' : activeChat === 'mantenimiento' ? 'Reporta maquinas dañadas con foto' : 'Preguntas frecuentes del gimnasio'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {activeChat === 'ia' && (
                                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                                        <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Objetivo</span>
                                            <select
                                                value={aiSettings.goal}
                                                onChange={(event) => setAiSettings((prev) => ({ ...prev, goal: event.target.value }))}
                                                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                            >
                                                {GOAL_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Nivel</span>
                                            <select
                                                value={aiSettings.level}
                                                onChange={(event) => setAiSettings((prev) => ({ ...prev, level: event.target.value }))}
                                                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                            >
                                                {LEVEL_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Dias</span>
                                            <select
                                                value={aiSettings.daysPerWeek}
                                                onChange={(event) => setAiSettings((prev) => ({ ...prev, daysPerWeek: sanitizeDaysPerWeekInput(event.target.value) }))}
                                                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                            >
                                                {DAYS_PER_WEEK_OPTIONS.map((value) => (
                                                    <option key={value} value={value}>{value}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Tiempo</span>
                                            <select
                                                value={aiSettings.sessionLength}
                                                onChange={(event) => setAiSettings((prev) => ({ ...prev, sessionLength: event.target.value }))}
                                                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                                            >
                                                {TIME_OPTIONS.map((option) => (
                                                    <option key={option.value || 'optional'} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                )}
                            </header>

                            <div
                                ref={chatBodyRef}
                                className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_55%),linear-gradient(180deg,#1e293b_0%,#0f172a_100%)] px-3 py-4 md:px-6"
                            >
                                {activeChat === 'ia' && aiHistoryLoading && aiMessages.length === 0 && (
                                    <div className="mx-auto mt-10 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                                        <Loader2 size={15} className="animate-spin" /> Cargando historial de rutinas...
                                    </div>
                                )}

                                {displayedMessages.length === 0 && !aiHistoryLoading && (
                                    <div className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-400">
                                        Todavia no hay mensajes en esta conversacion.
                                    </div>
                                )}

                                {displayedMessages.map((message) => (
                                    <ChatBubble
                                        key={message.id}
                                        role={message.role}
                                        text={message.text}
                                        time={formatBubbleTime(message.createdAt)}
                                        pending={message.pending}
                                    />
                                ))}
                            </div>

                            <footer className="border-t border-slate-700 bg-slate-900/60 px-3 py-3 md:px-4">
                                {activeChat === 'soporte' && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {quickQuestions.slice(0, 4).map((question) => (
                                            <button
                                                key={question}
                                                type="button"
                                                onClick={() => handleSupportQuickQuestion(question)}
                                                className="rounded-full border border-slate-600 bg-slate-800/60 px-3 py-1 text-xs text-slate-200 transition hover:border-violet-400 hover:text-violet-200"
                                            >
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeChat === 'mantenimiento' && (
                                    <div className="mb-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                                        Este chat queda fijo para reportar maquinas echadas a perder. Usa el formulario de abajo para elegir la maquina y adjuntar foto.
                                    </div>
                                )}

                                {activeChat === 'mantenimiento' && catalogoError && (
                                    <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{catalogoError}</div>
                                )}

                                {activeChat === 'ia' && aiHistoryError && (
                                    <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                        No se pudo leer el historial de rutinas con esta sesion. Aun puedes generar nuevas rutinas en este chat.
                                    </div>
                                )}

                                {activeChat === 'ia' && aiSendError && (
                                    <div className="mb-2 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs text-red-200">{aiSendError}</div>
                                )}

                                {activeChat === 'mantenimiento' ? (
                                    <FormularioReporteEnChat maquinas={catalogoMaquinas} onSuccess={handleReportCreated} />
                                ) : (
                                    <form onSubmit={handleSend} className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                                            {activeChat === 'ia' ? <Dumbbell size={16} /> : <MessageCircle size={16} />}
                                        </div>

                                        <input
                                            value={EntradaMensaje}
                                            onChange={(event) => setEntradaMensaje(event.target.value)}
                                            placeholder={activeChat === 'ia' ? 'Describe tu objetivo y te genero una rutina...' : 'Escribe tu duda...'}
                                            className="h-11 w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-400"
                                        />

                                        <button
                                            type="submit"
                                            disabled={isGenerating && activeChat === 'ia'}
                                            className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-cyan-600 px-3 text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isGenerating && activeChat === 'ia' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </form>
                                )}
                            </footer>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SoporteWhatsAppPanel;

