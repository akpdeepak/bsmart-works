// bSmart Works — UI string catalogue (iteration-20 Cap A: Localization, 10+ languages).
// One flat key namespace shared by every locale; English is the source-of-truth fallback. New keys
// are added to `en` first; a missing translation falls back to English (never a blank string), so a
// partially-translated locale degrades gracefully rather than breaking the UI. RTL locales (ar) are
// declared in RTL_LOCALES below so the shell can flip direction.

export const LOCALES = [
  { code: 'en', label: 'English',    native: 'English' },
  { code: 'hi', label: 'Hindi',      native: 'हिन्दी' },
  { code: 'es', label: 'Spanish',    native: 'Español' },
  { code: 'fr', label: 'French',     native: 'Français' },
  { code: 'de', label: 'German',     native: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'ja', label: 'Japanese',   native: '日本語' },
  { code: 'zh', label: 'Mandarin',   native: '中文' },
  { code: 'ar', label: 'Arabic',     native: 'العربية' },
  { code: 'ko', label: 'Korean',     native: '한국어' },
];

export const RTL_LOCALES = new Set(['ar']);

export const DEFAULT_LOCALE = 'en';

// Core navigation + common-action strings. Kept deliberately focused (the high-traffic surfaces);
// the catalogue grows key-by-key as screens are localized, with English as the guaranteed fallback.
export const MESSAGES = {
  en: {
    'app.tagline': 'Where work gets done',
    'nav.home': 'Home', 'nav.myWork': 'My Work', 'nav.board': 'Board', 'nav.backlog': 'Backlog',
    'nav.sprint': 'Active Sprint', 'nav.reports': 'Reports', 'nav.dashboards': 'Dashboards',
    'nav.knowledge': 'Knowledge', 'nav.aiStudio': 'AI Studio', 'nav.marketplace': 'Marketplace',
    'nav.settings': 'Settings',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.create': 'Create', 'common.delete': 'Delete',
    'common.search': 'Search', 'common.loading': 'Loading…', 'common.language': 'Language',
    'common.send': 'Send', 'common.signOut': 'Sign out',
  },
  hi: {
    'app.tagline': 'जहाँ काम पूरा होता है',
    'nav.home': 'होम', 'nav.myWork': 'मेरा कार्य', 'nav.board': 'बोर्ड', 'nav.backlog': 'बैकलॉग',
    'nav.sprint': 'सक्रिय स्प्रिंट', 'nav.reports': 'रिपोर्ट', 'nav.dashboards': 'डैशबोर्ड',
    'nav.knowledge': 'ज्ञान', 'nav.aiStudio': 'एआई स्टूडियो', 'nav.marketplace': 'मार्केटप्लेस',
    'nav.settings': 'सेटिंग्स',
    'common.save': 'सहेजें', 'common.cancel': 'रद्द करें', 'common.create': 'बनाएँ', 'common.delete': 'हटाएँ',
    'common.search': 'खोजें', 'common.loading': 'लोड हो रहा है…', 'common.language': 'भाषा',
    'common.send': 'भेजें', 'common.signOut': 'साइन आउट',
  },
  es: {
    'app.tagline': 'Donde el trabajo se hace',
    'nav.home': 'Inicio', 'nav.myWork': 'Mi trabajo', 'nav.board': 'Tablero', 'nav.backlog': 'Backlog',
    'nav.sprint': 'Sprint activo', 'nav.reports': 'Informes', 'nav.dashboards': 'Paneles',
    'nav.knowledge': 'Conocimiento', 'nav.aiStudio': 'Estudio IA', 'nav.marketplace': 'Mercado',
    'nav.settings': 'Ajustes',
    'common.save': 'Guardar', 'common.cancel': 'Cancelar', 'common.create': 'Crear', 'common.delete': 'Eliminar',
    'common.search': 'Buscar', 'common.loading': 'Cargando…', 'common.language': 'Idioma',
    'common.send': 'Enviar', 'common.signOut': 'Cerrar sesión',
  },
  fr: {
    'app.tagline': 'Là où le travail se fait',
    'nav.home': 'Accueil', 'nav.myWork': 'Mon travail', 'nav.board': 'Tableau', 'nav.backlog': 'Backlog',
    'nav.sprint': 'Sprint actif', 'nav.reports': 'Rapports', 'nav.dashboards': 'Tableaux de bord',
    'nav.knowledge': 'Connaissances', 'nav.aiStudio': 'Studio IA', 'nav.marketplace': 'Marché',
    'nav.settings': 'Paramètres',
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.create': 'Créer', 'common.delete': 'Supprimer',
    'common.search': 'Rechercher', 'common.loading': 'Chargement…', 'common.language': 'Langue',
    'common.send': 'Envoyer', 'common.signOut': 'Se déconnecter',
  },
  de: {
    'app.tagline': 'Wo Arbeit erledigt wird',
    'nav.home': 'Start', 'nav.myWork': 'Meine Arbeit', 'nav.board': 'Board', 'nav.backlog': 'Backlog',
    'nav.sprint': 'Aktiver Sprint', 'nav.reports': 'Berichte', 'nav.dashboards': 'Dashboards',
    'nav.knowledge': 'Wissen', 'nav.aiStudio': 'KI-Studio', 'nav.marketplace': 'Marktplatz',
    'nav.settings': 'Einstellungen',
    'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.create': 'Erstellen', 'common.delete': 'Löschen',
    'common.search': 'Suchen', 'common.loading': 'Wird geladen…', 'common.language': 'Sprache',
    'common.send': 'Senden', 'common.signOut': 'Abmelden',
  },
  pt: {
    'app.tagline': 'Onde o trabalho acontece',
    'nav.home': 'Início', 'nav.myWork': 'Meu trabalho', 'nav.board': 'Quadro', 'nav.backlog': 'Backlog',
    'nav.sprint': 'Sprint ativo', 'nav.reports': 'Relatórios', 'nav.dashboards': 'Painéis',
    'nav.knowledge': 'Conhecimento', 'nav.aiStudio': 'Estúdio IA', 'nav.marketplace': 'Mercado',
    'nav.settings': 'Configurações',
    'common.save': 'Salvar', 'common.cancel': 'Cancelar', 'common.create': 'Criar', 'common.delete': 'Excluir',
    'common.search': 'Pesquisar', 'common.loading': 'Carregando…', 'common.language': 'Idioma',
    'common.send': 'Enviar', 'common.signOut': 'Sair',
  },
  ja: {
    'app.tagline': '仕事が進む場所',
    'nav.home': 'ホーム', 'nav.myWork': 'マイワーク', 'nav.board': 'ボード', 'nav.backlog': 'バックログ',
    'nav.sprint': 'アクティブスプリント', 'nav.reports': 'レポート', 'nav.dashboards': 'ダッシュボード',
    'nav.knowledge': 'ナレッジ', 'nav.aiStudio': 'AIスタジオ', 'nav.marketplace': 'マーケットプレイス',
    'nav.settings': '設定',
    'common.save': '保存', 'common.cancel': 'キャンセル', 'common.create': '作成', 'common.delete': '削除',
    'common.search': '検索', 'common.loading': '読み込み中…', 'common.language': '言語',
    'common.send': '送信', 'common.signOut': 'サインアウト',
  },
  zh: {
    'app.tagline': '工作完成的地方',
    'nav.home': '主页', 'nav.myWork': '我的工作', 'nav.board': '看板', 'nav.backlog': '待办列表',
    'nav.sprint': '当前迭代', 'nav.reports': '报告', 'nav.dashboards': '仪表板',
    'nav.knowledge': '知识库', 'nav.aiStudio': 'AI 工作室', 'nav.marketplace': '应用市场',
    'nav.settings': '设置',
    'common.save': '保存', 'common.cancel': '取消', 'common.create': '创建', 'common.delete': '删除',
    'common.search': '搜索', 'common.loading': '加载中…', 'common.language': '语言',
    'common.send': '发送', 'common.signOut': '退出登录',
  },
  ar: {
    'app.tagline': 'حيث يُنجَز العمل',
    'nav.home': 'الرئيسية', 'nav.myWork': 'عملي', 'nav.board': 'اللوحة', 'nav.backlog': 'قائمة الأعمال',
    'nav.sprint': 'السباق النشط', 'nav.reports': 'التقارير', 'nav.dashboards': 'لوحات المعلومات',
    'nav.knowledge': 'المعرفة', 'nav.aiStudio': 'استوديو الذكاء', 'nav.marketplace': 'المتجر',
    'nav.settings': 'الإعدادات',
    'common.save': 'حفظ', 'common.cancel': 'إلغاء', 'common.create': 'إنشاء', 'common.delete': 'حذف',
    'common.search': 'بحث', 'common.loading': 'جارٍ التحميل…', 'common.language': 'اللغة',
    'common.send': 'إرسال', 'common.signOut': 'تسجيل الخروج',
  },
  ko: {
    'app.tagline': '업무가 완성되는 곳',
    'nav.home': '홈', 'nav.myWork': '내 작업', 'nav.board': '보드', 'nav.backlog': '백로그',
    'nav.sprint': '활성 스프린트', 'nav.reports': '보고서', 'nav.dashboards': '대시보드',
    'nav.knowledge': '지식', 'nav.aiStudio': 'AI 스튜디오', 'nav.marketplace': '마켓플레이스',
    'nav.settings': '설정',
    'common.save': '저장', 'common.cancel': '취소', 'common.create': '생성', 'common.delete': '삭제',
    'common.search': '검색', 'common.loading': '불러오는 중…', 'common.language': '언어',
    'common.send': '보내기', 'common.signOut': '로그아웃',
  },
};

// Resolve a key for a locale, falling back to English then the key itself.
export function translate(locale, key) {
  const table = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
  if (table && key in table) return table[key];
  const en = MESSAGES[DEFAULT_LOCALE];
  return en && key in en ? en[key] : key;
}
