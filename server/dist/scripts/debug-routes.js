"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const assets_routes_1 = __importDefault(require("../routes/assets.routes"));
/**
 * Debug script to list all registered routes in the asset router
 */
function listRoutes(router) {
    const routes = [];
    // This extracts the stack of route handlers from the Express router
    if (router && router.stack) {
        router.stack.forEach((layer) => {
            if (layer.route) {
                const path = layer.route.path;
                const methods = Object.keys(layer.route.methods).map(method => method.toUpperCase());
                routes.push({ path, methods });
            }
            else if (layer.name === 'router' && layer.handle.stack) {
                // Recursively extract routes from sub-routers
                const subRoutes = listRoutes(layer.handle);
                routes.push(...subRoutes.map(route => ({
                    path: layer.regexp.source + route.path,
                    methods: route.methods
                })));
            }
        });
    }
    return routes;
}
// Main function to debug routes
async function main() {
    try {
        console.log('Debugging Asset Routes...');
        // Create a dummy Express app
        const app = (0, express_1.default)();
        // Mount the asset routes
        app.use('/api/assets', assets_routes_1.default);
        // List the registered routes
        console.log('\nRegistered Asset Routes:');
        // Get the routes from the Express app
        const routes = listRoutes(app._router);
        routes.forEach(route => {
            console.log(`${route.methods.join(', ')} ${route.path}`);
        });
        // Specifically check for the by-client route
        const byClientRoute = routes.find(route => route.path.includes('by-client'));
        if (byClientRoute) {
            console.log('\n✅ Found by-client route:', byClientRoute);
        }
        else {
            console.log('\n❌ No by-client route found!');
        }
    }
    catch (error) {
        console.error('Error debugging routes:', error);
    }
}
main().catch(console.error);
