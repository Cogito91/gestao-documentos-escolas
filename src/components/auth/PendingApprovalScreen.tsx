import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  LogOut, 
  User, 
  Mail, 
  GraduationCap, 
  BookOpen,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const PendingApprovalScreen: React.FC = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRefresh = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      await refreshProfile();
      setFeedback('Status verificado! Caso a Pedagoga já tenha liberado, seu acesso iniciará automaticamente.');
    } catch (e: any) {
      setFeedback('Não foi possível verificar no momento. Tente novamente em instantes.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100/20 text-center">
        
        {/* Topo de Alerta de Análise */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white relative">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/30 shadow-inner">
            <Clock className="w-9 h-9 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Cadastro em Análise</h2>
          <p className="text-amber-100 text-xs mt-1">Acesso Restrito — Aguardando Aprovação</p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5 text-left">
          
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Proteção e Sigilo Escolar</span>
            </div>
            <p className="leading-relaxed">
              Olá, <strong>{profile?.full_name || 'Professor(a)'}</strong>! Sua solicitação de acesso à <strong>E.M. Antônio Matias</strong> foi registrada com sucesso, mas por medidas de segurança de dados e conformidade da escola, sua conta precisa ser autorizada pela <strong>Pedagoga</strong> antes de liberar os documentos e turmas.
            </p>
          </div>

          {/* Dados do cadastro enviado */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Dados do seu Registro:
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span><strong>Nome:</strong> {profile?.full_name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="break-all"><strong>E-mail:</strong> {profile?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span><strong>Disciplina:</strong> {profile?.discipline || 'A definir pela Gestão'}</span>
            </div>
          </div>

          {feedback && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={checking}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Consultando Liberação...' : 'Verificar se já fui Liberado(a)'}</span>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Sair da Conta</span>
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-400">
            Dúvidas? Entre em contato diretamente com a Coordenação Pedagógica da sua escola.
          </p>

        </div>

      </div>
    </div>
  );
};
