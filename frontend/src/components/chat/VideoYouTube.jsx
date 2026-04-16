import React from 'react';
import { Video } from 'lucide-react';

export default function VideoYouTube({ videoId, nombreEjercicio }) {
    if (!videoId) {
        return (
            <div className="flex h-32 w-full flex-col items-center justify-center rounded-xl bg-slate-900/50 border border-slate-700 text-slate-500">
                <Video size={24} className="mb-2 opacity-50" />
                <span className="text-xs">Video no disponible</span>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden rounded-xl pt-[56.25%] shadow-lg shadow-black/50">
            <iframe
                className="absolute left-0 top-0 h-full w-full border-0"
                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Tutorial de ${nombreEjercicio}`}
            ></iframe>
        </div>
    );
}