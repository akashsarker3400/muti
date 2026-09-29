/**
 * `server-only` exists to make a build fail when server code is imported into
 * a client bundle. Vitest runs under Node with no bundler boundary, so the
 * real module's throw is noise; this stub keeps server-side helpers testable.
 */
export {};
