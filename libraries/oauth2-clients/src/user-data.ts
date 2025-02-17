import type { Prettify } from './type-utilities';

export type BaseUserData<
  T extends string,
  U extends Record<string, unknown>,
  V = unknown,
> = Prettify<{
  provider: T;
  basicInfo: U;
  extra?: V;
}>;

export type GoogleUserData = BaseUserData<
  'google',
  {
    id: string;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
  }
>;

export type UserData = GoogleUserData;
