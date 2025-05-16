import { createHash, randomBytes } from 'crypto';

import dotenv from 'dotenv';
//hash
function sha256(content: string) {
    return createHash('sha256').update(content).digest('hex');
}

export function hashPassword(password: string) {
    return sha256(password);
}
export function comparePassword(
    password: string,
    hashedPassword: string
): boolean {
    const hashedInputPassword = hashPassword(password);
    return hashedInputPassword === hashedPassword;
}
