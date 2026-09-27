import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function getUserByEmail(email: string) {
    await connectToDatabase();
    const user = await User.findOne({ email });
    return user;
}

export async function getUserById(id: string) {
    await connectToDatabase();
    const user = await User.findById(id);
    return user;
}

export async function createUser(data: any) {
    await connectToDatabase();
    const newUser = await User.create(data);
    return newUser;
}

export async function updateUser(id: string, data: any) {
    await connectToDatabase();
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    );
    return updatedUser;
}

export async function hashPassword(password: string) {
    const salt = await bcrypt.genSalt(7);
    return await bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}
