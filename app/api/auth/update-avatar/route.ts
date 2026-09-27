import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        const { userId, email, avatar } = await req.json();

        if (!avatar || (!userId && !email)) {
            return NextResponse.json(
                { message: "Missing required avatar or user identification" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const query = userId ? { _id: userId } : { email };
        const updatedUser = await User.findOneAndUpdate(
            query,
            { $set: { avatar } },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "Avatar updated successfully",
            avatar: updatedUser.avatar,
        });
    } catch (error: any) {
        console.error("Update avatar error:", error);
        return NextResponse.json(
            { message: error.message || "Failed to update avatar" },
            { status: 500 }
        );
    }
}
