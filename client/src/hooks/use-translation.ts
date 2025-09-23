import { useTranslation } from 'react-i18next';

type UseTResult = {
  readonly t: ReturnType<typeof useTranslation>['t'];
  readonly language: string;
  readonly changeLanguage: ReturnType<typeof useTranslation>['i18n']['changeLanguage'];
};

export const useT = (): UseTResult => {
  const { t, i18n } = useTranslation();

  return {
    t,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage
  };
};

export default useT;
