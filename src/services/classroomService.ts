import { supabase } from '../lib/supabaseClient';

export interface ClassroomLayout {
  rows: number;
  cols: number;
  seats: Record<string, string>; // chave: "r-c" (ex: "0-1"), valor: nome do estudante
  updatedAt?: string;
  updatedBy?: string;
}

export interface ClassRegentsConfig {
  regents: Record<string, { teacherId: string; teacherName: string }>; // chave: turma (ex: "9º Ano A"), valor: regente
  layouts: Record<string, ClassroomLayout>; // chave: turma, valor: layout da sala
}

const STORAGE_KEY = 'school_class_regents_and_layouts';
const SYNC_TAG = '<!--CLASSROOM_MAPPING_SYNC_v1-->';

export const classroomService = {
  // Carrega configurações locais com fallback
  getLocalConfig(): ClassRegentsConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    // Configuração inicial padrão: Prof. Walter como regente do 9º Ano A
    return {
      regents: {
        '9º Ano A': {
          teacherId: '96d72e68-c5fe-4f1e-8e6d-3d6b5badc434', // Walter Guimarães dos Santos
          teacherName: 'Prof. Walter Guimarães (Inglês)',
        },
      },
      layouts: {
        '9º Ano A': {
          rows: 5,
          cols: 6,
          seats: {},
          updatedAt: new Date().toISOString(),
          updatedBy: 'Prof. Walter Guimarães',
        },
      },
    };
  },

  // Salva localmente
  saveLocalConfig(config: ClassRegentsConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  },

  // Sincroniza via tabela messages no Supabase (com cache em localStorage)
  async fetchConfig(): Promise<ClassRegentsConfig> {
    const local = this.getLocalConfig();
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .like('content', `${SYNC_TAG}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const payload = data[0].content.replace(SYNC_TAG, '').trim();
        const parsed: ClassRegentsConfig = JSON.parse(payload);
        // Garante que o 9º Ano A tenha Walter como regente por padrão se não definido
        if (!parsed.regents['9º Ano A']) {
          parsed.regents['9º Ano A'] = {
            teacherId: '96d72e68-c5fe-4f1e-8e6d-3d6b5badc434',
            teacherName: 'Prof. Walter Guimarães (Inglês)',
          };
        }
        this.saveLocalConfig(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('Falha ao sincronizar mapeamento remoto, usando local:', err);
    }
    return local;
  },

  // Salva no banco de dados Supabase e no localStorage
  async saveConfig(config: ClassRegentsConfig, authorId?: string): Promise<void> {
    this.saveLocalConfig(config);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const senderId = authorId || user?.id;
      if (!senderId) return;

      const content = `${SYNC_TAG}${JSON.stringify(config)}`;
      // Grava no messages para que todos os usuários (pedagoga e professores) recebam
      await supabase.from('messages').insert({
        sender_id: senderId,
        recipient_id: senderId,
        content,
      });
    } catch (err) {
      console.warn('Erro ao salvar mapeamento no Supabase:', err);
    }
  },

  // Define ou altera o professor regente de uma turma (Ação da Pedagoga)
  async setRegent(className: string, teacherId: string, teacherName: string): Promise<ClassRegentsConfig> {
    const config = await this.fetchConfig();
    config.regents[className] = { teacherId, teacherName };
    if (!config.layouts[className]) {
      config.layouts[className] = {
        rows: 5,
        cols: 6,
        seats: {},
        updatedAt: new Date().toISOString(),
        updatedBy: teacherName,
      };
    }
    await this.saveConfig(config);
    return config;
  },

  // Remove regente de uma turma
  async removeRegent(className: string): Promise<ClassRegentsConfig> {
    const config = await this.fetchConfig();
    delete config.regents[className];
    await this.saveConfig(config);
    return config;
  },

  // Atualiza o layout e mapa de carteiras de uma turma (Ação do Professor Regente)
  async updateClassLayout(
    className: string,
    layout: Partial<ClassroomLayout>,
    teacherName: string
  ): Promise<ClassRegentsConfig> {
    const config = await this.fetchConfig();
    const current = config.layouts[className] || {
      rows: 5,
      cols: 6,
      seats: {},
    };

    config.layouts[className] = {
      ...current,
      ...layout,
      updatedAt: new Date().toISOString(),
      updatedBy: teacherName,
    };

    await this.saveConfig(config);
    return config;
  },
};
