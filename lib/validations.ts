export const validateEmail = (email: string) => {
    if (!email || !email.trim()) {
        return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return "Please enter a valid email address";
    }
    return null;
};

export const validatePassword = (password: string) => {
    if (!password || password.length < 8) {
        return "Password must be at least 8 characters long";
    }
    if (password.length > 14) {
        return "Password must be at most 14 characters long";
    }
    return null;
};
