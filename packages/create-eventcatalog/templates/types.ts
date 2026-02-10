import { PackageManager } from '../helpers/get-pkg-manager';

export type TemplateType =
  | 'default'
  | 'app'
  | 'empty'
  | 'asyncapi'
  | 'openapi'
  | 'confluent'
  | 'eventbridge'
  | 'amazon-apigateway'
  | 'graphql';
export type TemplateMode = 'js' | 'ts';

export interface GetTemplateFileArgs {
  template: TemplateType;
  mode: TemplateMode;
  file: string;
}

export interface InstallTemplateArgs {
  appName: string;
  root: string;
  packageManager: PackageManager;
  isOnline: boolean;
  organizationName: string;
  template: TemplateType;
  mode: TemplateMode;
  eslint: boolean;
}
