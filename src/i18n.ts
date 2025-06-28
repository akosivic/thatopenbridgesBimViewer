import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enTranslations = {
  logout: 'Logout',
  login: 'Login',
  bimManager: 'BIM Manager'
};

// Japanese translations
const jaTranslations = {
  logout: 'ログアウト',
  login: 'ログイン',
  bimManager: 'BIMマネージャー'
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      ja: {
        translation: jaTranslations
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;