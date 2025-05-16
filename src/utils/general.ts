import { IResponse } from "../interfaces/response/response.interface";

//SEND RESPONSE FOR LIST
const jsonAll = function <Res>(
  res: any,
  status: number,
  data: Res[],
  meta: Object = {}
): IResponse<Res> {
  return res.status(status).json({
    data: data,
    meta: {
      ...meta,
    },
  });
};

//SEND RESPONSE FOR DETAIL
const jsonOne = function <Res>(res: any, status: number, data: Res): Res {
  return res.status(status).json({
    data,
  });
};

//EXPORT
export { jsonAll, jsonOne };
