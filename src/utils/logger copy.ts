import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
let logCount = 0;
let logErrCount = 0;
const addAPIIndex = format((info) => {
    logCount += 1;
    info.index = logCount; // Thêm số thứ tự vào log
    return info;
});
const addErrorIndex = format((error) => {
    logErrCount += 1;
    error.index = logErrCount; // Thêm số thứ tự vào log
    return error;
});

// Logger dành cho API log
export const APIlog = winston.createLogger({
    level: 'info',
    format: format.combine(
        addAPIIndex(),
        format.timestamp(),
        format.json() // Ghi log dưới dạng JSON
    ),
    transports: [
        new DailyRotateFile({
            filename: '%DATE%-apis.log', // Tên file log theo ngày
            datePattern: 'YYYY-MM-DD', // Định dạng ngày
            dirname: 'logs/apis', // Thư mục gốc cho logs
            maxFiles: '7d', // Giữ lại log trong 7 ngày
            level: 'info', // Ghi log cấp info trở lên
        }),
    ],
});

// Logger dành cho log lỗi
export const errorLog = winston.createLogger({
    level: 'error', // Chỉ ghi log từ cấp độ error trở lên
    format: format.combine(
        addErrorIndex(),
        format.timestamp(), // Thêm timestamp vào mỗi log
        format.json() // Ghi log dưới dạng JSON
    ),
    transports: [
        new DailyRotateFile({
            filename: '%DATE%-errors.log', // Tên file log lỗi
            datePattern: 'YYYY-MM-DD', // Định dạng ngày
            dirname: 'logs/errors', // Thư mục con cho log lỗi
            maxFiles: '7d', // Giữ lại log lỗi trong 7 ngày
            level: 'error', // Ghi log cấp error
        }),
    ],
});
