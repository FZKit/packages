import type { Prettify } from './type-utilities';

export type BaseUserData<T extends string> = Prettify<{
  provider: T;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  data: Record<string, any>;
}>;

export type GoogleUserData = BaseUserData<'google'>;

export type AppleUserData = BaseUserData<'apple'>;

export type UserData = GoogleUserData | AppleUserData;
