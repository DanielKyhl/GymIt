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
    const [registeredUsers, setRegisteredUsers] = useState<User[]> ([]);
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
    const alreadyExists = registeredUsers.some((u) => u.email === email);
    if (alreadyExists) {
        alert("An account with that email already exists.");
        return;
    }
    setRegisteredUsers([...registeredUsers, {email, password}]);
    setUser({email, password});
    AsyncStorage.setItem("user", JSON.stringify({email, password}));
};
    const login = (email: string, password: string) => {
    const match = registeredUsers.find(
        (u) => u.email === email && u.password === password
    );
    if (match) {
        setUser(match);
        AsyncStorage.setItem("user", JSON.stringify(match));
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