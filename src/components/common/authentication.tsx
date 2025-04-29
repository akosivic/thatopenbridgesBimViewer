import { useEffect, useState } from 'react';

export const checkAuthStatus = async () => {
    try {
        const response = await fetch('/.auth/me');
        const payload = await response.json();

        // Check if user has valid authentication data
        if (payload && payload.clientPrincipal) {
            // You can access user details if needed
            const userDetails = {
                userId: payload.clientPrincipal.userId,
                userRoles: payload.clientPrincipal.userRoles,
                identityProvider: payload.clientPrincipal.identityProvider,
                userDetails: payload.clientPrincipal.userDetails
            };
            return { isAuthenticated: true, userDetails };
        }

        return { isAuthenticated: false, userDetails: null };
    } catch (error) {
        console.error('Error checking authentication status:', error);
        return { isAuthenticated: false, userDetails: null };
    }
};

export const login = async (path) => {
    try {
        const currentPath = path || window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `/.auth/login/aad?post_login_redirect_uri=${returnUrl}`;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};

export const logout = async () => {
    try {
        // Clear any local storage if needed
        localStorage.clear();

        // Redirect to the logout endpoint
        window.location.href = '/.auth/logout';
    } catch (error) {
        console.error('Logout failed:', error);
        throw error;
    }
};

export const useAuth = () => {
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        userDetails: null,
        isLoading: true
    });

    const checkAuth = async () => {
        try {
            const result = await checkAuthStatus();
            setAuthState({
                isAuthenticated: result.isAuthenticated,
                userDetails: result.userDetails,
                isLoading: false
            });
        } catch (error) {
            setAuthState({
                isAuthenticated: false,
                userDetails: null,
                isLoading: false
            });
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return { ...authState, refreshAuth: checkAuth };
};