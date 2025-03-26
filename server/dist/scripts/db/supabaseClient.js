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
exports.supabase = void 0;
exports.initializeDatabase = initializeDatabase;
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var isDevelopment = process.env.NODE_ENV !== 'production';
var supabaseUrl = process.env.SUPABASE_URL;
// Determine which key to use based on environment
// In development, prefer the service role key for unrestricted access
var supabaseKey;
if (isDevelopment && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️ Using Supabase service role key for development');
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
}
else {
    supabaseKey = process.env.SUPABASE_KEY;
}
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Please check your .env file');
}
// Create client with appropriate key
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// For prototype mode, we'll use Supabase's built-in SQL execution
// to create tables directly instead of using RPC calls
/**
 * Create signoff sessions table
 */
function createSignoffSessionsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, createError, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('Checking signoff_sessions table...');
                    return [4 /*yield*/, exports.supabase.from('signoff_sessions').select('count').limit(1)];
                case 1:
                    error = (_a.sent()).error;
                    if (!error) {
                        console.log('signoff_sessions table already exists');
                        return [2 /*return*/];
                    }
                    console.log('Creating signoff_sessions table...');
                    return [4 /*yield*/, exports.supabase.rpc('exec_sql', {
                            sql_string: "\n        CREATE TABLE IF NOT EXISTS signoff_sessions (\n          id UUID PRIMARY KEY,\n          campaign_id UUID REFERENCES campaigns(id),\n          title TEXT NOT NULL,\n          description TEXT,\n          status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'in_review', 'approved', 'rejected', 'completed')),\n          client_email TEXT NOT NULL,\n          client_name TEXT NOT NULL,\n          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n          expires_at TIMESTAMP WITH TIME ZONE,\n          access_token TEXT NOT NULL,\n          created_by UUID REFERENCES auth.users(id),\n          feedback TEXT,\n          matrix_id UUID,\n          review_url TEXT\n        );\n      "
                        })];
                case 2:
                    createError = (_a.sent()).error;
                    if (createError) {
                        console.error('Error creating signoff_sessions table:', createError);
                        throw createError;
                    }
                    console.log('signoff_sessions table created successfully');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error in createSignoffSessionsTable:', error_1);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create signoff assets table
 */
function createSignoffAssetsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, createError, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('Checking signoff_assets table...');
                    return [4 /*yield*/, exports.supabase.from('signoff_assets').select('count').limit(1)];
                case 1:
                    error = (_a.sent()).error;
                    if (!error) {
                        console.log('signoff_assets table already exists');
                        return [2 /*return*/];
                    }
                    console.log('Creating signoff_assets table...');
                    return [4 /*yield*/, exports.supabase.rpc('exec_sql', {
                            sql_string: "\n        CREATE TABLE IF NOT EXISTS signoff_assets (\n          id UUID PRIMARY KEY,\n          session_id UUID REFERENCES signoff_sessions(id) ON DELETE CASCADE,\n          asset_id UUID REFERENCES assets(id),\n          status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),\n          feedback TEXT,\n          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n          version_number INTEGER NOT NULL DEFAULT 1\n        );\n      "
                        })];
                case 2:
                    createError = (_a.sent()).error;
                    if (createError) {
                        console.error('Error creating signoff_assets table:', createError);
                        throw createError;
                    }
                    console.log('signoff_assets table created successfully');
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('Error in createSignoffAssetsTable:', error_2);
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create signoff responses table
 */
function createSignoffResponsesTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, createError, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('Checking signoff_responses table...');
                    return [4 /*yield*/, exports.supabase.from('signoff_responses').select('count').limit(1)];
                case 1:
                    error = (_a.sent()).error;
                    if (!error) {
                        console.log('signoff_responses table already exists');
                        return [2 /*return*/];
                    }
                    console.log('Creating signoff_responses table...');
                    return [4 /*yield*/, exports.supabase.rpc('exec_sql', {
                            sql_string: "\n        CREATE TABLE IF NOT EXISTS signoff_responses (\n          id UUID PRIMARY KEY,\n          session_id UUID REFERENCES signoff_sessions(id) ON DELETE CASCADE,\n          client_name TEXT NOT NULL,\n          client_email TEXT NOT NULL,\n          feedback TEXT,\n          status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'partial')),\n          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n          approved_assets JSONB,\n          rejected_assets JSONB\n        );\n      "
                        })];
                case 2:
                    createError = (_a.sent()).error;
                    if (createError) {
                        console.error('Error creating signoff_responses table:', createError);
                        throw createError;
                    }
                    console.log('signoff_responses table created successfully');
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    console.error('Error in createSignoffResponsesTable:', error_3);
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create clients table
 */
function createClientsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, createError, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log('Checking clients table...');
                    return [4 /*yield*/, exports.supabase.from('clients').select('count').limit(1)];
                case 1:
                    error = (_a.sent()).error;
                    if (!error) {
                        console.log('clients table already exists');
                        return [2 /*return*/];
                    }
                    console.log('Creating clients table...');
                    return [4 /*yield*/, exports.supabase.rpc('exec_sql', {
                            sql_string: "\n        CREATE TABLE IF NOT EXISTS clients (\n          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n          name TEXT NOT NULL,\n          logo_url TEXT,\n          primary_color TEXT,\n          secondary_color TEXT,\n          description TEXT,\n          is_active BOOLEAN DEFAULT TRUE,\n          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),\n          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()\n        );\n        \n        -- Add client_id column to assets table\n        ALTER TABLE \"assets\" \n        ADD COLUMN IF NOT EXISTS \"client_id\" UUID REFERENCES \"clients\"(\"id\") ON DELETE SET NULL;\n        \n        -- Add client_id column to templates table\n        ALTER TABLE \"templates\" \n        ADD COLUMN IF NOT EXISTS \"client_id\" UUID REFERENCES \"clients\"(\"id\") ON DELETE SET NULL;\n        \n        -- Add client_id column to campaigns table\n        ALTER TABLE \"campaigns\" \n        ADD COLUMN IF NOT EXISTS \"client_id\" UUID REFERENCES \"clients\"(\"id\") ON DELETE SET NULL;\n        \n        -- Create index for performance\n        CREATE INDEX IF NOT EXISTS \"idx_assets_client_id\" ON \"assets\"(\"client_id\");\n        CREATE INDEX IF NOT EXISTS \"idx_templates_client_id\" ON \"templates\"(\"client_id\");\n        CREATE INDEX IF NOT EXISTS \"idx_campaigns_client_id\" ON \"campaigns\"(\"client_id\");\n        \n        -- Create trigger for clients table\n        CREATE OR REPLACE FUNCTION update_updated_at_column()\n        RETURNS TRIGGER AS $$\n        BEGIN\n           NEW.updated_at = now();\n           RETURN NEW;\n        END;\n        $$ language 'plpgsql';\n        \n        DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;\n        CREATE TRIGGER update_clients_updated_at\n        BEFORE UPDATE ON clients\n        FOR EACH ROW\n        EXECUTE PROCEDURE update_updated_at_column();\n      "
                        })];
                case 2:
                    createError = (_a.sent()).error;
                    if (createError) {
                        console.error('Error creating clients table:', createError);
                        throw createError;
                    }
                    console.log('clients table created successfully');
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error('Error in createClientsTable:', error_4);
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 11, , 12]);
                    console.log('Initializing database with real database connection.');
                    // Create users table first (since other tables may reference it)
                    return [4 /*yield*/, createUsersTable()];
                case 1:
                    // Create users table first (since other tables may reference it)
                    _a.sent();
                    // Create assets table
                    return [4 /*yield*/, createAssetsTable()];
                case 2:
                    // Create assets table
                    _a.sent();
                    // Create templates table
                    return [4 /*yield*/, createTemplatesTable()];
                case 3:
                    // Create templates table
                    _a.sent();
                    // Create campaigns table
                    return [4 /*yield*/, createCampaignsTable()];
                case 4:
                    // Create campaigns table
                    _a.sent();
                    // Create executions table
                    return [4 /*yield*/, createExecutionsTable()];
                case 5:
                    // Create executions table
                    _a.sent();
                    // Create exports table
                    return [4 /*yield*/, createExportsTable()];
                case 6:
                    // Create exports table
                    _a.sent();
                    // Create clients table
                    return [4 /*yield*/, createClientsTable()];
                case 7:
                    // Create clients table
                    _a.sent();
                    // Create signoff sessions table
                    return [4 /*yield*/, createSignoffSessionsTable()];
                case 8:
                    // Create signoff sessions table
                    _a.sent();
                    // Create signoff assets table
                    return [4 /*yield*/, createSignoffAssetsTable()];
                case 9:
                    // Create signoff assets table
                    _a.sent();
                    // Create signoff responses table
                    return [4 /*yield*/, createSignoffResponsesTable()];
                case 10:
                    // Create signoff responses table
                    _a.sent();
                    console.log('Database initialization complete.');
                    return [3 /*break*/, 12];
                case 11:
                    error_5 = _a.sent();
                    console.error('Error initializing database:', error_5);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function createAssetsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('Checking assets table...');
                    return [4 /*yield*/, exports.supabase.from('assets').select('count').limit(1)];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error checking assets table:', error);
                        // For prototype mode, we continue anyway to allow the application to function
                        if (process.env.PROTOTYPE_MODE === 'true') {
                            console.log('In prototype mode, continuing with in-memory data...');
                        }
                    }
                    else {
                        console.log('Assets table seems to be accessible.');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_6 = _a.sent();
                    console.error('Error checking if table exists:', error_6);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createTemplatesTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('Creating templates table...');
                    return [4 /*yield*/, exports.supabase.rpc('create_table_if_not_exists', {
                            table_name: 'templates',
                            table_definition: "\n        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n        name TEXT NOT NULL,\n        description TEXT,\n        format TEXT NOT NULL,\n        thumbnail_url TEXT,\n        platforms JSONB,\n        creatomate_template_id TEXT,\n        slots JSONB,\n        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n      "
                        })];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error creating templates table:', error);
                        // Log error but don't throw to allow other tables to be created
                        console.log('Continuing with database initialization...');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_7 = _a.sent();
                    console.error('Error checking if table exists:', error_7);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createCampaignsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('Creating campaigns table...');
                    return [4 /*yield*/, exports.supabase.rpc('create_table_if_not_exists', {
                            table_name: 'campaigns',
                            table_definition: "\n        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n        name TEXT NOT NULL,\n        description TEXT,\n        client TEXT,\n        status TEXT NOT NULL DEFAULT 'draft',\n        platforms JSONB,\n        tags JSONB,\n        start_date TIMESTAMP WITH TIME ZONE,\n        end_date TIMESTAMP WITH TIME ZONE,\n        owner_id UUID,\n        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n      "
                        })];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error creating campaigns table:', error);
                        // Log error but don't throw to allow other tables to be created
                        console.log('Continuing with database initialization...');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_8 = _a.sent();
                    console.error('Error checking if table exists:', error_8);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createExecutionsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('Creating executions table...');
                    return [4 /*yield*/, exports.supabase.rpc('create_table_if_not_exists', {
                            table_name: 'executions',
                            table_definition: "\n        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n        name TEXT NOT NULL,\n        campaign_id UUID REFERENCES campaigns(id),\n        template_id UUID REFERENCES templates(id),\n        status TEXT NOT NULL DEFAULT 'draft',\n        url TEXT,\n        thumbnail_url TEXT,\n        assets JSONB,\n        render_job_id TEXT,\n        platform TEXT,\n        format TEXT,\n        owner_id UUID,\n        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n      "
                        })];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error creating executions table:', error);
                        // Log error but don't throw to allow other tables to be created
                        console.log('Continuing with database initialization...');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_9 = _a.sent();
                    console.error('Error checking if table exists:', error_9);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createExportsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('Creating exports table...');
                    return [4 /*yield*/, exports.supabase.rpc('create_table_if_not_exists', {
                            table_name: 'exports',
                            table_definition: "\n        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n        execution_id UUID REFERENCES executions(id),\n        platform TEXT NOT NULL,\n        status TEXT NOT NULL DEFAULT 'pending',\n        url TEXT,\n        format TEXT NOT NULL,\n        file_size INTEGER,\n        settings JSONB,\n        owner_id UUID,\n        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n        completed_at TIMESTAMP WITH TIME ZONE\n      "
                        })];
                case 1:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error('Error creating exports table:', error);
                        // Log error but don't throw to allow other tables to be created
                        console.log('Continuing with database initialization...');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_10 = _a.sent();
                    console.error('Error checking if table exists:', error_10);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create users table for authentication and authorization
 */
function createUsersTable() {
    return __awaiter(this, void 0, void 0, function () {
        var error, signUpError, e_1, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    console.log('Checking users table...');
                    return [4 /*yield*/, exports.supabase.from('users').select('count').limit(1)];
                case 1:
                    error = (_a.sent()).error;
                    if (!error) return [3 /*break*/, 6];
                    console.error('Error checking users table:', error);
                    if (!(process.env.NODE_ENV === 'development')) return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, exports.supabase.auth.signUp({
                            email: 'admin@airwave.com',
                            password: 'Admin123!',
                            options: {
                                data: {
                                    name: 'Admin User',
                                    role: 'admin'
                                }
                            }
                        })];
                case 3:
                    signUpError = (_a.sent()).error;
                    if (signUpError) {
                        console.error('Error creating default admin user:', signUpError);
                    }
                    else {
                        console.log('Default admin user created successfully.');
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    console.error('Exception creating default user:', e_1);
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 7];
                case 6:
                    console.log('Users table seems to be accessible.');
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_11 = _a.sent();
                    console.error('Error checking users table:', error_11);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
