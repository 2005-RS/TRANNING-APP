import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';
import { commonCopySource, type CommonCopy } from '@/i18n/locales/en/common';

registerEnglishNamespace('common', commonCopySource);

export const commonCopy = createLiveCopy<CommonCopy>('common');

export function useCommonCopy() {
  return useLiveCopy<CommonCopy>('common');
}
