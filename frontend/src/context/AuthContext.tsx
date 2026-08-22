import React, { createContext, useContext, useState } from 'react';

export type Role = 'ADMIN' | 'HR' | 'EMPLOYEE';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to ADMIN for mock demo purposes
  const [user, setUser] = useState<User | null>({
    id: '1',
    name: 'Jyesht Doe',
    email: 'jyesht@dayflow.com',
    role: 'ADMIN'
  });

  const login = (role: Role) => {
    setUser({
      id: '2',
      name: 'Demo User',
      email: `demo@dayflow.com`,
      role
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
