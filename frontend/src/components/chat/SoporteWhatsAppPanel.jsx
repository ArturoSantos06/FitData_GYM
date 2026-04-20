import React from 'react';
import { Bot, Dumbbell, Loader2, MessageCircle, Send, Sparkles, Wrench, User, Stethoscope } from 'lucide-react';

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
                    ? 'bg-emerald-800/80 text-emerald-50 rounded-br-sm border border-emerald-600/30'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-300/60'
                    }`}
            >
                <p className="whitespace-pre-wrap text-sm leading-5">{text}</p>
                <div className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${isUser ? 'text-emerald-200/80' : 'text-slate-500'}`}>
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
        <div className="relative left-1/2 w-[calc(100vw-4rem)] -translate-x-1/2 animate-fade-in px-1 md:w-[calc(100vw-6rem)] md:px-2">
            <div className="mx-auto h-[calc(100vh-3.5rem)] min-h-[840px] max-h-[1180px] w-full max-w-none overflow-hidden rounded-2xl border border-slate-700 bg-[#0b141a] shadow-2xl">
                <div className="flex h-full flex-col md:flex-row">
                    <aside className={`w-full border-b border-slate-700 bg-[#111b21] md:w-[460px] md:border-b-0 md:border-r flex-col ${showSidebarMobile ? 'flex' : 'hidden md:flex'}`}>
                        <div className="border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-100">Mensajes</h2>
                                <p className="text-xs text-slate-400">Vista estilo chat para cliente</p>
                            </div>
                            {currentUser && <CentroNotificaciones userId={currentUser.uid} />}
                        </div>

                        <div className="p-2 overflow-y-auto">
                            {trainerId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveChat('entrenador');
                                        setShowSidebarMobile(false);
                                    }}
                                    className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'entrenador' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                                            <User size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-100">Entrenador</p>
                                            <p className="truncate text-xs text-slate-400">{trainerName}</p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            {nutritionistId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveChat('nutriologo');
                                        setShowSidebarMobile(false);
                                    }}
                                    className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'nutriologo' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                                            <Stethoscope size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-100">Nutriólogo</p>
                                            <p className="truncate text-xs text-slate-400">{nutritionistName}</p>
                                        </div>
                                    </div>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setActiveChat('ia')}
                                className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'ia' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
                                        <Sparkles size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-100">IA de Rutinas</p>
                                        <p className="truncate text-xs text-slate-400">{aiPreview}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveChat('soporte')}
                                className={`w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'soporte' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                                        <MessageCircle size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-100">Ayuda FitData</p>
                                        <p className="truncate text-xs text-slate-400">{supportPreview}</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveChat('mantenimiento')}
                                className={`mt-2 w-full rounded-xl px-3 py-3 text-left transition ${activeChat === 'mantenimiento' ? 'bg-[#202c33] border border-cyan-500/40' : 'hover:bg-[#1f2c33] border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                                        <Wrench size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-100">Reporte de Máquinas</p>
                                        <p className="truncate text-xs text-slate-400">{maintenancePreview}</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </aside>

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
                            <header className="border-b border-slate-700 bg-[#202c33] px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${activeChat === 'ia' ? 'bg-cyan-500/20 text-cyan-200' : activeChat === 'mantenimiento' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                                        {activeChat === 'ia' ? <Bot size={18} /> : activeChat === 'mantenimiento' ? <Wrench size={18} /> : <MessageCircle size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-100">{activeChat === 'ia' ? 'Entrenador IA' : activeChat === 'mantenimiento' ? 'Reporte de Máquinas' : 'Ayuda y Soporte'}</p>
                                        <p className="text-xs text-slate-400">{activeChat === 'ia' ? 'Rutinas personalizadas en tiempo real' : activeChat === 'mantenimiento' ? 'Reporta maquinas dañadas con foto' : 'Preguntas frecuentes del gimnasio'}</p>
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
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
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
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
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
                                                    <option key={value} value={value}>
                                                        {value}
                                                    </option>
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
                                                    <option key={option.value || 'optional'} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                )}
                            </header>

                            <div
                                ref={chatBodyRef}
                                className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%),linear-gradient(180deg,#0b141a_0%,#0f1a20_100%)] px-3 py-4 md:px-6"
                            >
                                {activeChat === 'ia' && aiHistoryLoading && aiMessages.length === 0 && (
                                    <div className="mx-auto mt-10 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                                        <Loader2 size={15} className="animate-spin" /> Cargando historial de rutinas...
                                    </div>
                                )}

                                {displayedMessages.length === 0 && !aiHistoryLoading && (
                                    <div className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-slate-600 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-300">
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

                            <footer className="border-t border-slate-700 bg-[#202c33] px-3 py-3 md:px-4">
                                {activeChat === 'soporte' && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {quickQuestions.slice(0, 4).map((question) => (
                                            <button
                                                key={question}
                                                type="button"
                                                onClick={() => handleSupportQuickQuestion(question)}
                                                className="rounded-full border border-slate-600 bg-slate-800/60 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
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
                                    <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                        {catalogoError}
                                    </div>
                                )}

                                {activeChat === 'ia' && aiHistoryError && (
                                    <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                        No se pudo leer el historial de rutinas con esta sesion. Aun puedes generar nuevas rutinas en este chat.
                                    </div>
                                )}

                                {activeChat === 'ia' && aiSendError && (
                                    <div className="mb-2 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs text-red-200">
                                        {aiSendError}
                                    </div>
                                )}

                                {activeChat === 'mantenimiento' ? (
                                    <FormularioReporteEnChat
                                        maquinas={catalogoMaquinas}
                                        onSuccess={handleReportCreated}
                                    />
                                ) : (
                                    <form onSubmit={handleSend} className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
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
