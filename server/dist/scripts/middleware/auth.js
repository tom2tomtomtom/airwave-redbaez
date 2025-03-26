"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticateToken = exports.AUTH_MODE = void 0;
var supabaseClient_1 = require("../db/supabaseClient");
/**
 * Authentication configuration
 */
// Single source of truth for auth mode
exports.AUTH_MODE = {
    // Main auth mode - controls which authentication mechanism is active
    // Values: 'production', 'development', 'prototype'
    CURRENT: process.env.NODE_ENV === 'production' ? 'production' :
        process.env.PROTOTYPE_MODE === 'true' ? 'prototype' : 'development',
    // Explicit auth bypass (only works in development and prototype modes)
    BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true',
    // Development user constants - must match client-side values
    DEV_USER_ID: '00000000-0000-0000-0000-000000000000',
    DEV_TOKEN: 'dev-token-fixed-airwave'
};
// Log the current auth mode on startup
console.log("Auth Mode: ".concat(exports.AUTH_MODE.CURRENT, " ").concat(exports.AUTH_MODE.BYPASS_AUTH ? '(with auth bypass)' : ''));
/**
 * Middleware to authenticate Supabase token and attach user to request
 */
var authenticateToken = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, data, error_1, authHeader, token, authenticatedUser, sessionData, _a, userData, userError, error_2, _b, dbUser, dbError, user, error_3;
    var _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                console.log('Running authenticateToken middleware');
                if (!(exports.AUTH_MODE.CURRENT === 'development' || exports.AUTH_MODE.CURRENT === 'prototype')) return [3 /*break*/, 4];
                // If explicitly bypassing auth, use the development user
                if (exports.AUTH_MODE.BYPASS_AUTH) {
                    console.log("".concat(exports.AUTH_MODE.CURRENT.toUpperCase(), " MODE: Bypassing authentication with DEV_USER_ID"));
                    // Assign a consistent development user
                    req.user = {
                        id: exports.AUTH_MODE.DEV_USER_ID, // Consistent development user ID
                        email: 'dev@example.com',
                        name: 'Development User',
                        role: 'admin'
                    };
                    return [2 /*return*/, next()];
                }
                authHeader = req.headers['authorization'] || req.headers['Authorization'];
                if (!(authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer '))) return [3 /*break*/, 4];
                console.log("".concat(exports.AUTH_MODE.CURRENT.toUpperCase(), " MODE: Using simplified auth"));
                token = authHeader.split(' ')[1];
                if (token === exports.AUTH_MODE.DEV_TOKEN) {
                    console.log('Development token detected, using dev user');
                    // Use the development user
                    req.user = {
                        id: exports.AUTH_MODE.DEV_USER_ID,
                        email: 'dev@example.com',
                        name: 'Development User',
                        role: 'admin'
                    };
                    return [2 /*return*/, next()];
                }
                _h.label = 1;
            case 1:
                _h.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabaseClient_1.supabase.auth.getSession()];
            case 2:
                data = (_h.sent()).data;
                if ((_c = data === null || data === void 0 ? void 0 : data.session) === null || _c === void 0 ? void 0 : _c.user) {
                    // Use the session user
                    req.user = {
                        id: data.session.user.id,
                        email: data.session.user.email || '',
                        name: ((_d = data.session.user.user_metadata) === null || _d === void 0 ? void 0 : _d.name) || 'User',
                        role: ((_e = data.session.user.user_metadata) === null || _e === void 0 ? void 0 : _e.role) || 'user'
                    };
                    return [2 /*return*/, next()];
                }
                return [3 /*break*/, 4];
            case 3:
                error_1 = _h.sent();
                console.log('Error getting session in development mode:', error_1);
                return [3 /*break*/, 4];
            case 4:
                _h.trys.push([4, 13, , 14]);
                authHeader = req.headers['authorization'] || req.headers['Authorization'];
                console.log('Auth header present:', !!authHeader);
                token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;
                if (!token) {
                    console.log('No token provided in the request');
                    return [2 /*return*/, res.status(401).json({
                            success: false,
                            message: 'Authentication required'
                        })];
                }
                authenticatedUser = null;
                _h.label = 5;
            case 5:
                _h.trys.push([5, 10, , 11]);
                return [4 /*yield*/, supabaseClient_1.supabase.auth.getSession()];
            case 6:
                sessionData = (_h.sent()).data;
                if (!(sessionData === null || sessionData === void 0 ? void 0 : sessionData.session)) return [3 /*break*/, 7];
                console.log('Using Supabase session from cookies');
                authenticatedUser = sessionData.session.user;
                return [3 /*break*/, 9];
            case 7:
                // If no session from cookies, try with the provided token
                console.log('No session from cookies, trying with token');
                return [4 /*yield*/, supabaseClient_1.supabase.auth.getUser(token)];
            case 8:
                _a = _h.sent(), userData = _a.data, userError = _a.error;
                if (userError || !userData.user) {
                    console.error('Supabase token verification failed:', (userError === null || userError === void 0 ? void 0 : userError.message) || 'Invalid token');
                    return [2 /*return*/, res.status(403).json({
                            success: false,
                            message: 'Invalid or expired token'
                        })];
                }
                authenticatedUser = userData.user;
                _h.label = 9;
            case 9: return [3 /*break*/, 11];
            case 10:
                error_2 = _h.sent();
                console.error('Error during Supabase authentication:', error_2);
                return [2 /*return*/, res.status(403).json({
                        success: false,
                        message: 'Authentication error'
                    })];
            case 11:
                console.log('Supabase token verified for user:', authenticatedUser.id);
                return [4 /*yield*/, supabaseClient_1.supabase
                        .from('users')
                        .select('id, email, name, role')
                        .eq('id', authenticatedUser.id)
                        .single()];
            case 12:
                _b = _h.sent(), dbUser = _b.data, dbError = _b.error;
                if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is 'not found'
                    console.error('Error fetching user from database:', dbError.message);
                }
                user = dbUser || {
                    id: authenticatedUser.id,
                    email: authenticatedUser.email || '',
                    name: ((_f = authenticatedUser.user_metadata) === null || _f === void 0 ? void 0 : _f.name) || 'User',
                    role: ((_g = authenticatedUser.user_metadata) === null || _g === void 0 ? void 0 : _g.role) || 'user'
                };
                // Attach the verified user data to the request
                req.user = user;
                console.log('User verified and attached to request:', req.user.id);
                next();
                return [3 /*break*/, 14];
            case 13:
                error_3 = _h.sent();
                console.error('Authentication error:', error_3);
                return [2 /*return*/, res.status(500).json({
                        success: false,
                        message: 'Authentication failed'
                    })];
            case 14: return [2 /*return*/];
        }
    });
}); };
exports.authenticateToken = authenticateToken;
/**
 * Middleware to restrict access to admin users
 */
var requireAdmin = function (req, res, next) {
    console.log('Checking admin permissions for user:', req.user);
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    if (req.user.role !== 'admin') {
        console.log('Access denied - user is not admin. Role:', req.user.role);
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
    console.log('Admin access granted');
    next();
};
exports.requireAdmin = requireAdmin;
