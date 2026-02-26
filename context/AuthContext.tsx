import {createContext, useState, ReactNode, useContext} from "react";

type User = {
    email: string;
    password: string;
};
type AuthContextType = {
    user: User | null;
    signup: (email: string, password: string) => void;
    login: (email: string, password: string) => boolean;
    logout: () => void;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [registeredUsers, setRegisteredUsers] = useState<User | null>(null);

    const signup = (email: string, password: string) => {
        setRegisteredUsers ({email, password});
    };
    const login = (email: string, password: string) => {
        if (registeredUsers && registeredUsers.email === email && registeredUsers.password === password) {
            setUser({email, password});
            return true;
        }
        return false;
    };
    const logout = () => {
        setUser(null);
    };
    return (
        <AuthContext.Provider value={{user, signup, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return  context;
}