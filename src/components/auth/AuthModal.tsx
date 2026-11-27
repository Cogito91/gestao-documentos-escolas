import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  User, 
  BookOpen, 
  KeyRound, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Phone,
  AlertCircle,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

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
  'POLIVALENTE / ANOS INICIAIS',
];

export const AuthModal: React.FC = () => {
  const { signIn, signUp, enterSimulation } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('Manhã');
  const [inviteCode, setInviteCode] = useState('');

  // Análise de força da senha
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Vazia', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Fraca (mínimo 8 dígitos)', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Média', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Boa', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Muito Segura', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: 'Muito Curta', color: 'bg-rose-400' };
    }
  };

  const passStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim() || !email.trim() || !password) {
          throw new Error('Preencha todos os campos obrigatórios marcados com asterisco (*).');
        }

        if (password.length < 8) {
          throw new Error('A senha deve conter no mínimo 8 caracteres para proteção da conta.');
        }

        if (password !== confirmPassword) {
          throw new Error('A confirmação de senha não confere com a senha digitada.');
        }

        if (!discipline) {
          throw new Error('Selecione a disciplina do professor.');
        }

        if (!inviteCode.trim()) {
          throw new Error('Informe o Código de Convite da Escola fornecido pela Pedagoga.');
        }

        // Cadastro seguro: sempre perfil 'professor' com código de convite
        await signUp(
          email.trim(),
          password,
          fullName.trim(),
          'professor',
          discipline,
          phone.trim() || undefined,
          shift,
          undefined,
          undefined,
          inviteCode.trim()
        );

        setSuccessMessage(
          'Cadastro realizado com sucesso! Para sua segurança e da escola, seu acesso foi enviado para aprovação da Pedagoga. Você receberá liberação em breve.'
        );
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
        setInviteCode('');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('Código de convite')) {
        setError(err.message);
      } else if (err.message?.includes('rate limit')) {
        setError('Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes antes de tentar novamente.');
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (err.message?.includes('User already registered')) {
        setError('Este e-mail já possui cadastro. Acesse a aba "Acessar Conta" para entrar.');
      } else {
        setError(err.message || 'Falha na autenticação. Verifique suas credenciais ou conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100/20">
        
        {/* Topo / Banner Institucional */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm shadow-inner border border-white/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">E.M. Antônio Matias</h1>
          <p className="text-blue-100 text-xs mt-1">Plataforma de Gestão Pedagógica & Documentos</p>
          <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[11px] font-semibold text-blue-50 border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Acesso Escolar Restrito & Protegido</span>
          </div>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6">
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-bold transition-colors relative ${
                !isRegister ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Acessar Conta
              {!isRegister && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-bold transition-colors relative ${
                isRegister ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Novo Cadastro
              {isRegister && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-start space-x-2 animate-fadeIn">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Se for cadastro */}
            {isRegister && (
              <>
                {/* Alerta de proteção da escola */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Cadastro Exclusivo para Docentes da Escola</span>
                  </div>
                  <p className="text-amber-800">
                    Para impedir acessos externos não autorizados, é necessário informar o <strong>Código de Convite da Escola</strong> e aguardar a aprovação da Pedagoga.
                  </p>
                </div>

                {/* Código de Convite da Escola */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>Código de Convite da Escola *</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Fornecido pela Pedagoga</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MATIAS2026"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-blue-300 rounded-xl bg-blue-50/30 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Nome Completo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo do Professor *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Disciplina e Turno */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Disciplina Principal *</label>
                    <div className="relative">
                      <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <select
                        required
                        value={discipline}
                        onChange={(e) => setDiscipline(e.target.value)}
                        className="w-full pl-9 pr-2 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="">Selecione...</option>
                        {DISCIPLINE_OPTIONS.map((disc) => (
                          <option key={disc} value={disc}>
                            {disc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Turno Principal *</label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Integral">Integral</option>
                      <option value="Noite">Noite</option>
                    </select>
                  </div>
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp (Opcional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Ex: (92) 98765-4321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isRegister ? 'E-mail para Login *' : 'E-mail Cadastrado *'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Senha de Acesso *</label>
                {isRegister && (
                  <span className="text-[10px] text-slate-500 font-medium">Mínimo 8 caracteres</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={isRegister ? 'Crie uma senha segura (mín. 8 caracteres)' : 'Sua senha'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {isRegister && password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Força da Senha:</span>
                    <span className="font-bold text-slate-700">{passStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${passStrength.color}`}
                      style={{ width: `${Math.min(100, Math.max(15, passStrength.score * 25))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirmação de Senha (no cadastro) */}
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirmar Senha *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Solicitar Cadastro na Escola' : 'Entrar no Sistema'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ACESSO RÁPIDO PARA TESTES DOS DOIS AMBIENTES (PEDAGOGA & PROFESSOR) */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Acesso Imediato para Testes das Áreas:</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                1 Clique
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => enterSimulation('pedagoga')}
                className="p-2.5 bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold transition text-left flex flex-col justify-between shadow-2xs group"
                title="Acessar o Painel Completo da Pedagoga"
              >
                <div className="flex items-center space-x-1.5 mb-1 text-purple-700">
                  <ShieldCheck className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold">Área da Pedagoga</span>
                </div>
                <span className="text-[10px] text-purple-700/80 font-normal">Supervisão, 18 profs & prazos</span>
              </button>

              <button
                type="button"
                onClick={() => enterSimulation('ingles_manha')}
                className="p-2.5 bg-gradient-to-br from-blue-50 to-teal-50 hover:from-blue-100 hover:to-teal-100 border border-blue-200 text-blue-950 rounded-xl text-xs font-bold transition text-left flex flex-col justify-between shadow-2xs group"
                title="Acessar a Área do Professor"
              >
                <div className="flex items-center space-x-1.5 mb-1 text-blue-700">
                  <User className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold">Área do Professor</span>
                </div>
                <span className="text-[10px] text-blue-700/80 font-normal">Diário, envio & 1º bimestre</span>
              </button>
            </div>
          </div>

          {/* Rodapé de Informação de Segurança */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500">
              {isRegister ? (
                <span>
                  Após o cadastro com o código de convite, o perfil aguarda autorização da Pedagoga.
                </span>
              ) : (
                <span>
                  Para alternar entre as visões depois de entrar, utilize o botão na barra superior.
                </span>
              )}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
