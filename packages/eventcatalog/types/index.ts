import { MDXRemoteSerializeResult } from 'next-mdx-remote';

export interface MarkdownFile {
  content: string;
  source: MDXRemoteSerializeResult;
  lastModifiedDate: string;
}
