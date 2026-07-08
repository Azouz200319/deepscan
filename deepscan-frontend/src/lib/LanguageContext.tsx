import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'English' | 'French' | 'Arabic';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  English: {
    'nav.dashboard': 'Dashboard',
    'nav.scan': 'Scan & Extract',
    'nav.identity': 'Linked Check',
    'nav.forgery': 'Forgery Detection',
    'nav.database': 'Database',
    'nav.history': 'History',
    'nav.auditArchive': 'Audit Archive',
    'nav.demoPipeline': 'Pipeline Demo',
    'nav.blacklist': 'Blacklist',
    'nav.settings': 'Settings',
    'nav.identity.desc': 'This section is for verification from an external database that we do not have in the system. The government should provide the link for access.',
    'nav.group.main': 'Overview',
    'nav.group.analysis': 'Operations',
    'nav.group.records': 'Management',
    'nav.group.system': 'System',
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.darkmode': 'Dark Mode',
    'settings.language': 'Language',
    'settings.save': 'Save Changes',
  },
  French: {
    'nav.dashboard': 'Tableau de bord',
    'nav.scan': 'Numériser & Extraire',
    'nav.identity': 'Contrôle lié',
    'nav.forgery': 'Détection de faux',
    'nav.database': 'Base de données',
    'nav.history': 'Historique',
    'nav.auditArchive': 'Archive des audits',
    'nav.demoPipeline': 'Démo du Pipeline',
    'nav.blacklist': 'Liste noire',
    'nav.settings': 'Paramètres',
    'nav.identity.desc': 'Cette section est destinée à la vérification à partir d\'une base de données externe que nous n\'avons pas dans le système. Le gouvernement devrait fournir le lien d\'accès.',
    'nav.group.main': 'Vue d\'ensemble',
    'nav.group.analysis': 'Opérations',
    'nav.group.records': 'Gestion',
    'nav.group.system': 'Système',
    'settings.save': 'Sauvegarder',
  },
  Arabic: {
    'nav.dashboard': 'لوحة القيادة',
    'nav.scan': 'المسح والاستخراج',
    'nav.identity': 'التحقق المرتبط',
    'nav.forgery': 'كشف التزوير',
    'nav.database': 'قاعدة البيانات',
    'nav.history': 'السجل',
    'nav.auditArchive': 'أرشيف التدقيق',
    'nav.demoPipeline': 'عرض خط التدقيق',
    'nav.blacklist': 'القائمة السوداء',
    'nav.settings': 'الإعدادات',
    'nav.identity.desc': 'هذا القسم مخصص للتحقق من قاعدة بيانات خارجية لا نملكها في النظام. يجب على الحكومة تقديم رابط الوصول.',
    'nav.group.main': 'نظرة عامة',
    'nav.group.analysis': 'العمليات',
    'nav.group.records': 'الإدارة',
    'nav.group.system': 'النظام',
    'settings.save': 'حفظ التغييرات',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('English');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div dir={language === 'Arabic' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
