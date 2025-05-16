export interface IAuthAdminReqBody {
  username: string;
  password: string;
  os: string;
}

export interface IUproleReqBody {
  _id: string;
  role: string;
}

export interface ILogoutUserAdminReqBody {
  ids: string[];
}
export interface IAuthUserReqBody {
    username: string;
    password: string;
}