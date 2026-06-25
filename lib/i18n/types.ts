export type Locale = 'en' | 'ar';

export interface TranslationDict {
  [key: string]: string | TranslationDict;
}
