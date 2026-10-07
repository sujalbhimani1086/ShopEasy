import { jwtVerify, SignJWT } from "jose";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error("JWT_SECRET must be configured to sign authentication tokens.");
}

const secret = new TextEncoder().encode(jwtSecret);

function derivePasswordKey(password: string, salt: Buffer, length: number) {
    return new Promise<Buffer>((resolve, reject) => {
        scrypt(password, salt, length, (error, key) => {
            if (error) reject(error);
            else resolve(key as Buffer);
        });
    });
}

export async function hashPassword(password: string) {
    const salt = randomBytes(16);
    const key = await derivePasswordKey(password, salt, 64);
    return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function isPasswordHashed(storedPassword: string) {
    return storedPassword.startsWith("scrypt$");
}

export async function verifyPassword(password: string, storedPassword: string) {
    if (!isPasswordHashed(storedPassword)) {
        const candidate = Buffer.from(password);
        const stored = Buffer.from(storedPassword);
        return candidate.length === stored.length && timingSafeEqual(candidate, stored);
    }

    const [, saltHex, keyHex, ...extra] = storedPassword.split("$");
    if (extra.length || !/^[\da-f]{32}$/i.test(saltHex) || !/^[\da-f]{128}$/i.test(keyHex)) {
        return false;
    }

    const expected = Buffer.from(keyHex, "hex");
    const actual = await derivePasswordKey(password, Buffer.from(saltHex, "hex"), expected.length);
    return timingSafeEqual(actual, expected);
}

export async function createToken(user: {
    id: number;
    email: string;
    role: string;
    status?: string;
}) {
    return new SignJWT(user)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(secret);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch {
        return null;
    }
}
