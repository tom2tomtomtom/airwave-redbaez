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
var supabaseClient_1 = require("../db/supabaseClient");
var auth_1 = require("../middleware/auth");
/**
 * Script to properly create the development user in all required tables
 * This ensures foreign key constraints are satisfied for asset uploads
 */
function createDevUser() {
    return __awaiter(this, void 0, void 0, function () {
        var DEV_USER_ID, _a, authUser, authError, _b, newAuthUser, createError, e_1, _c, dbUser, dbError, _d, insertData, insertError, _e, directData, directError, _f, verifyUser, verifyError, funcError, error_1;
        var _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    console.log('Starting development user fix...');
                    DEV_USER_ID = auth_1.AUTH_MODE.DEV_USER_ID;
                    console.log("Using development user ID: ".concat(DEV_USER_ID));
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 18, , 19]);
                    // Step 1: Check if user exists in auth.users table (using service role key if available)
                    console.log('Checking auth.users table...');
                    return [4 /*yield*/, supabaseClient_1.supabase.auth.admin.getUserById(DEV_USER_ID)];
                case 2:
                    _a = _h.sent(), authUser = _a.data, authError = _a.error;
                    if (!authError) return [3 /*break*/, 7];
                    console.log('Error checking auth.users or user not found:', authError.message);
                    console.log('Attempting to create development user in auth.users...');
                    _h.label = 3;
                case 3:
                    _h.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, supabaseClient_1.supabase.auth.admin.createUser({
                            uuid: DEV_USER_ID,
                            email: 'dev@example.com',
                            email_confirm: true,
                            user_metadata: {
                                name: 'Development User',
                                role: 'admin'
                            }
                        })];
                case 4:
                    _b = _h.sent(), newAuthUser = _b.data, createError = _b.error;
                    if (createError) {
                        console.log('Could not create user in auth.users:', createError.message);
                    }
                    else {
                        console.log('User created in auth.users successfully');
                    }
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _h.sent();
                    console.log('Exception creating auth user:', e_1.message);
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 8];
                case 7:
                    console.log('User exists in auth.users:', (_g = authUser === null || authUser === void 0 ? void 0 : authUser.user) === null || _g === void 0 ? void 0 : _g.id);
                    _h.label = 8;
                case 8:
                    // Step 2: Ensure the user exists in the public.users table
                    console.log('Checking public.users table...');
                    return [4 /*yield*/, supabaseClient_1.supabase
                            .from('users')
                            .select('id')
                            .eq('id', DEV_USER_ID)
                            .single()];
                case 9:
                    _c = _h.sent(), dbUser = _c.data, dbError = _c.error;
                    if (!(dbError || !dbUser)) return [3 /*break*/, 14];
                    console.log('User not found in public.users, inserting...');
                    return [4 /*yield*/, supabaseClient_1.supabase.rpc('insert_development_user', {
                            user_id: DEV_USER_ID,
                            user_email: 'dev@example.com',
                            user_name: 'Development User',
                            user_role: 'admin'
                        })];
                case 10:
                    _d = _h.sent(), insertData = _d.data, insertError = _d.error;
                    if (!insertError) return [3 /*break*/, 12];
                    console.log('Error inserting into public.users via RPC:', insertError.message);
                    return [4 /*yield*/, supabaseClient_1.supabase
                            .from('users')
                            .upsert({
                            id: DEV_USER_ID,
                            email: 'dev@example.com',
                            name: 'Development User',
                            role: 'admin',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' })];
                case 11:
                    _e = _h.sent(), directData = _e.data, directError = _e.error;
                    if (directError) {
                        console.log('Error with direct insert to public.users:', directError.message);
                        console.log('Details:', directError);
                    }
                    else {
                        console.log('User inserted into public.users via direct insert');
                    }
                    return [3 /*break*/, 13];
                case 12:
                    console.log('User inserted into public.users via RPC function');
                    _h.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    console.log('User exists in public.users:', dbUser.id);
                    _h.label = 15;
                case 15: return [4 /*yield*/, supabaseClient_1.supabase
                        .from('users')
                        .select('id, email, name, role')
                        .eq('id', DEV_USER_ID)
                        .single()];
                case 16:
                    _f = _h.sent(), verifyUser = _f.data, verifyError = _f.error;
                    if (verifyError || !verifyUser) {
                        console.log('VERIFICATION FAILED: User still not in public.users:', verifyError === null || verifyError === void 0 ? void 0 : verifyError.message);
                    }
                    else {
                        console.log('VERIFICATION SUCCESS: Development user exists in public.users');
                        console.log('User details:', verifyUser);
                    }
                    // Step 4: Create stored function for direct user insertion
                    console.log('Creating stored function for dev user insertion...');
                    return [4 /*yield*/, supabaseClient_1.supabase.rpc('create_insert_development_user_function')];
                case 17:
                    funcError = (_h.sent()).error;
                    if (funcError) {
                        console.log('Error creating function (may already exist):', funcError.message);
                    }
                    else {
                        console.log('Function created or already exists');
                    }
                    return [3 /*break*/, 19];
                case 18:
                    error_1 = _h.sent();
                    console.error('Unexpected error:', error_1.message);
                    return [3 /*break*/, 19];
                case 19: return [2 /*return*/];
            }
        });
    });
}
// Run the script
createDevUser().then(function () {
    console.log('Development user fix completed');
    process.exit(0);
}).catch(function (err) {
    console.error('Script failed:', err);
    process.exit(1);
});
