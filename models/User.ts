import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide a name"],
        },
        email: {
            type: String,
            required: [true, "Please provide an email"],
            unique: true,
        },
        password: {
            type: String,
            required: [true, "Please provide a password"],
        },
        avatar: {
            type: String,
            default: "https://robohash.org/Morsel",
        },
        country: {
            type: String,
            default: "India",
        },
        state: {
            type: String,
            default: "West Bengal",
        },
        city: {
            type: String,
            default: "Kolkata",
        },
    },
    {
        timestamps: true,
        strict: false,
    }
);

if (mongoose.models && mongoose.models.User) {
    delete (mongoose.models as any).User;
}

const User = mongoose.model("User", UserSchema);

export default User;
