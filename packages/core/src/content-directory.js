import path from 'node:path';

export const resolveContentDirectory = ({ projectDir, config = {}, env = process.env }) => {
  const absoluteProjectDir = path.resolve(projectDir);
  const configuredContentDir = env.CONTENT_DIR || config.contentDir || projectDir;
  return path.isAbsolute(configuredContentDir)
    ? path.resolve(configuredContentDir)
    : path.resolve(absoluteProjectDir, configuredContentDir);
};
