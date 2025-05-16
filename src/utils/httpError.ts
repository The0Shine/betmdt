import { IApiError } from "../interfaces/response/apiError.interface";

export default class HttpError extends Error {
    public readonly opts: IApiError;

    constructor(opts: IApiError) {
        super(opts.detail);
        this.opts = opts;
        Error.captureStackTrace(this);
    }

    sendError(res:any) {
        return res.status(this.opts.code).json({
            errors: [
                {
                    title: this.opts.title,
                    detail: this.opts.detail,
                    code: this.opts.code
                },
            ],
        });
    }
}
