import React from 'react';
import { Mail, ArrowRight, X, Sparkles } from 'lucide-react';

interface UnreadMessageNotificationProps {
  unreadCount: number;
  senderName?: string;
  onOpen: () => void;
  onClose: () => void;
}

export const UnreadMessageNotification: React.FC<UnreadMessageNotificationProps> = ({
  unreadCount,
  senderName,
  onOpen,
  onClose,
}) => {
  if (unreadCount <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      {/* Container do Card com Animação de Entrada */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-blue-100 max-w-sm w-full p-6 text-center overflow-hidden animate-bounce-short">
        {/* Detalhe de fundo com brilhos */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-100 rounded-full blur-2xl opacity-60 pointer-events-none" />

        {/* Botão de Fechar discreto */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          title="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animação lúdica da cartinha chegando */}
        <div className="relative mx-auto w-24 h-24 mb-4 flex items-center justify-center">
          {/* Ondulação de fundo */}
          <div className="absolute inset-0 rounded-full bg-blue-100/70 animate-ping" />
          
          {/* Ícone da Carta */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30 flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform">
            <Mail className="w-10 h-10 text-white animate-pulse" />
            <span className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white font-extrabold text-xs rounded-full flex items-center justify-center shadow border-2 border-white">
              {unreadCount}
            </span>
          </div>

          <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 left-2 animate-bounce" />
          <Sparkles className="w-4 h-4 text-indigo-400 absolute bottom-1 right-2 animate-pulse" />
        </div>

        {/* Título e Texto */}
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          Você tem nova mensagem! 📬
        </h3>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          {senderName ? (
            <>
              A pedagoga <strong>{senderName}</strong> enviou uma mensagem para você.
            </>
          ) : (
            <>
              Você tem <strong>{unreadCount} {unreadCount === 1 ? 'mensagem não lida' : 'mensagens não lidas'}</strong> da coordenação pedagógica.
            </>
          )}
        </p>

        {/* Botões de Ação */}
        <div className="mt-5 space-y-2">
          <button
            onClick={() => {
              onClose();
              onOpen();
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>Ler Mensagem Agora</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
          >
            Ver mais tarde
          </button>
        </div>
      </div>
    </div>
  );
};
