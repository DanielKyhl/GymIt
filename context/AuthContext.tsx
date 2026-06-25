import {createContext, useState, useEffect, ReactNode, useContext} from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
    email: string;
    password: string;
};
type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    signup: (email: string, password: string) => void;
    login: (email: string, password: string) => boolean;
    logout: () => void;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [registeredUsers, setRegisteredUsers] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const savedUser = await AsyncStorage.getItem("user");
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
            setIsLoading(false);
        };
        loadUser();
    }, []);

    const signup = (email: string, password: string) => {
        setRegisteredUsers ({email, password});
        setUser({email, password});
        AsyncStorage.setItem("user", JSON.stringify({email, password}));
    };
    const login = (email: string, password: string) => {
        if (registeredUsers && registeredUsers.email === email && registeredUsers.password === password) {
            setUser({email, password});
            AsyncStorage.setItem("user", JSON.stringify({email, password}));
            return true;
        }
        return false;
    };
    const logout = () => {
        setUser(null);
        AsyncStorage.removeItem("user");
    };
    return (
        <AuthContext.Provider value={{user, isLoading, signup, login, logout}}>
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