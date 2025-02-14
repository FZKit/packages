export interface UserDataBase<T extends string, U extends Record<string, unknown>, V = unknown> {
  provider: T;
  basicInfo: U;
  extra?: V;
}

export type GoogleUserData = UserDataBase<
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
