import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Lock, Mail, User, BookOpen, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { UserRole } from '../../types/database.types';

const DISCIPLINE_OPTIONS = [
  'LÍNGUA PORTUGUESA',
  'MATEMÁTICA',
  'CIÊNCIAS',
  'HISTÓRIA',
  'GEOGRAFIA',
  'LÍNGUA INGLESA',
  'ARTE',
  'EDUCAÇÃO FÍSICA',
  'ENSINO RELIGIOSO',
];

export const AuthModal: React.FC = () => {
  const { signIn, signUp, enterSimulation } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'professor' | 'pedagoga'>('professor');
  const [pedagogaAccessKey, setPedagogaAccessKey] = useState('');

  const PEDAGOGA_SECRET_CODE = 'AM@2026';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName || !email || !password) {
          throw new Error('Preencha todos os campos obrigatórios.');
        }

        if (selectedRole === 'professor' && !discipline) {
          throw new Error('Selecione a disciplina do professor.');
        }

        if (selectedRole === 'pedagoga') {
          if (!pedagogaAccessKey.trim()) {
            throw new Error('Informe a Senha Especial de Gestão / Pedagoga.');
          }
          if (pedagogaAccessKey.trim() !== PEDAGOGA_SECRET_CODE) {
            throw new Error('Senha Especial de Gestão / Pedagoga inválida.');
          }
        }

        const roleToAssign: UserRole = selectedRole === 'pedagoga' ? 'pedagoga' : 'professor';
        const discToAssign = selectedRole === 'pedagoga' ? 'Coordenação Pedagógica' : discipline;

        await signUp(email, password, fullName, roleToAssign, discToAssign, phone);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('rate limit')) {
        setError('Limite de envio de e-mail do Supabase atingido. Dica: No painel do Supabase > Authentication > Providers > Email, desmarque a opção "Confirm email".');
      } else {
        setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Botões de teste rápido com credenciais automáticas
  const handleQuickLogin = async (targetRole: 'pedagoga' | 'professor') => {
    setError(null);
    setLoading(true);

    const testEmail = targetRole === 'pedagoga' 
      ? 'pedagoga.regina@gmail.com' 
      : 'prof.carlos.matias@gmail.com';
    const testPassword = 'escola-senha-segura-123';
    const testName = targetRole === 'pedagoga' ? 'Profa. Regina (Pedagoga Geral)' : 'Prof. Carlos Eduardo';
    const testDiscipline = targetRole === 'pedagoga' ? 'Coordenação Pedagógica' : 'Matemática';

    try {
      // Tenta login direto
      await signIn(testEmail, testPassword);
    } catch (signInErr: any) {
      // Se não existir, tenta criar o usuário automaticamente
      try {
        await signUp(testEmail, testPassword, testName, targetRole, testDiscipline, '(11) 98765-4321');
        await signIn(testEmail, testPassword);
      } catch (signUpErr: any) {
        if (signUpErr.message?.includes('rate limit')) {
          setError('Aviso do Supabase: Limite de confirmação de e-mail atingido. No painel do Supabase > Authentication > Providers > Email, desmarque a opção "Confirm email" para liberar logins imediatos sem restrição.');
        } else {
          setError(signUpErr.message || 'Não foi possível autenticar o perfil de teste.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Topo / Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner border border-white/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">E.M. Antônio Matias</h1>
          <p className="text-blue-100 text-xs mt-1">Plataforma de Gestão Pedagógica & Documentos</p>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6">
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${
                !isRegister ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Acessar Conta
              {!isRegister && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${
                isRegister ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Novo Cadastro
              {isRegister && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
              <span className="font-bold">•</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Se for cadastro */}
            {isRegister && (
              <>
                {/* Seletor de Tipo de Perfil */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Perfil *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('professor');
                        setError(null);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        selectedRole === 'professor'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Professor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('pedagoga');
                        setError(null);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        selectedRole === 'pedagoga'
                          ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Pedagoga / Gestão</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder={selectedRole === 'pedagoga' ? 'Ex: Regina Célia (Pedagoga)' : 'Ex: Carlos Eduardo de Oliveira'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {selectedRole === 'professor' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Disciplina *</label>
                    <div className="relative">
                      <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <select
                        required
                        value={discipline}
                        onChange={(e) => setDiscipline(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="">Selecione sua disciplina...</option>
                        {DISCIPLINE_OPTIONS.map((disc) => (
                          <option key={disc} value={disc}>
                            {disc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-purple-900 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-purple-600" />
                        <span>Senha Especial de Gestão / Pedagoga *</span>
                      </span>
                      <span className="text-[10px] text-purple-600 font-normal">Exigida para cargo de gestão</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Digite a chave de segurança da gestão"
                      value={pedagogaAccessKey}
                      onChange={(e) => setPedagogaAccessKey(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-purple-50/40 text-purple-950 font-medium placeholder-purple-400"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Institucional *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Senha de Acesso *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Criar Cadastro' : 'Entrar na Plataforma'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Perfis de Teste da ETAPA 4 prontos com 1 clique */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-xs font-semibold text-slate-500 mb-3">
              Perfis de Teste Rápidos (Etapa 4):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('pedagoga')}
                disabled={loading}
                className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold transition text-left flex flex-col justify-between"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Perfil 1: Pedagoga</span>
                </div>
                <span className="text-[10px] text-purple-600/80 font-normal">Controle geral & análise</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('professor')}
                disabled={loading}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold transition text-left flex flex-col justify-between"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Perfil 2: Professor</span>
                </div>
                <span className="text-[10px] text-blue-600/80 font-normal">Envio próprio & pendências</span>
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
              <p className="text-center text-[11px] font-bold text-emerald-700 mb-2">
                Simulação Completa (18 Profs Manhã/Tarde + Inglês 1º Bim):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => enterSimulation('pedagoga')}
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition text-left"
                >
                  <div className="font-extrabold">Simular Pedagoga</div>
                  <div className="text-[10px] text-emerald-700/80 font-normal">
                    9 profs Manhã + 9 profs Tarde
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => enterSimulation('ingles_manha')}
                  className="p-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition text-left"
                >
                  <div className="font-extrabold">Simular Prof. Inglês</div>
                  <div className="text-[10px] text-teal-700/80 font-normal">
                    1º Bim 100% (aulas + docs)
                  </div>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
