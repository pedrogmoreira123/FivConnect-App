import { useTranslation } from 'react-i18next';

export const useT = () => {
  const { t, i18n } = useTranslation();
  
  return {
    t,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage
  };
};

export default useT;