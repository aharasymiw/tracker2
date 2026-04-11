/**
 * Wire protocol version. Bump on any breaking change to the envelope or to
 * ClientToServer/ServerToClient schemas. The server refuses connections with
 * a mismatched version and instructs the client to reload.
 */
export const PROTOCOL_VERSION = 1;
