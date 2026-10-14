/**
 * The architecture model: what agents send to draw a diagram, and what a `.eventcatalog` file holds (its resources,
 * how they relate, notes, hotspots and comments, and where things are). Plain data and its validation (zod), with
 * no React, so servers (the MCP tools) and browsers (Studio's canvases) read and write the same diagrams.
 */
export * from "./schema";
export * from "./validate";
