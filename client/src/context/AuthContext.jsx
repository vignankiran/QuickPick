import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(
    localStorage.getItem("quickpick_token")
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("quickpick_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (token, user) => {
    localStorage.setItem("quickpick_token", token);
    localStorage.setItem("quickpick_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("quickpick_token");
    localStorage.removeItem("quickpick_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};