import { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { Date } from 'mongoose';

// Giao diện cho RefreshToken
export interface IRefreshToken {
    _id?: ObjectId;
    token: string;
    createdAt: Date;
    userId: ObjectId;
    admin: boolean;
    os: string;
    ip: string;
    iat: Date;
    exp: Date;
}

export interface IRefreshTokenPayLoad extends JwtPayload {
    _id: string;
    role: string;
}
