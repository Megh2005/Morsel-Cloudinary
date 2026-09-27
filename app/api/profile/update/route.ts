import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById, updateUser } from "@/lib/services";

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { name, avatar } = body;

        // Validate input
        const updateData: any = {};

        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return NextResponse.json(
                    { message: "Name cannot be empty" },
                    { status: 400 }
                );
            }
            updateData.name = name.trim();
        }

        if (avatar !== undefined) {
            updateData.avatar = avatar;
        }

        const { country, state, city } = body;
        if (country !== undefined) updateData.country = country;
        if (state !== undefined) updateData.state = state;
        if (city !== undefined) updateData.city = city;

        // Update user in database
        const updatedUser = await updateUser(session.user.id, updateData);

        if (!updatedUser) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "Profile updated successfully",
            user: {
                id: updatedUser._id.toString(),
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                country: updatedUser.country || "",
                state: updatedUser.state || "",
                city: updatedUser.city || "",
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
