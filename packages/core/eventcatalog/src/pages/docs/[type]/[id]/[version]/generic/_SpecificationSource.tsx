import { useState } from 'react';
import SchemaCodeBlock from '@components/SchemaExplorer/SchemaCodeBlock';
import SchemaCodeModal from '@components/SchemaExplorer/SchemaCodeModal';
import { copyToClipboard } from '@components/SchemaExplorer/utils';

interface Props {
  /** The specification's name, shown in fullscreen */
  name: string;
  version: string;
  code: string;
  /** The syntax to highlight: json, yaml, xml or text */
  language: string;
}

/** A generic specification's source, in the same code box as the Schema Explorer */
export default function SpecificationSource({ name, version, code, language }: Props) {
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const onCopy = async () => {
    if (!(await copyToClipboard(code))) return;
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      <SchemaCodeBlock
        code={code}
        extension={language}
        onCopy={onCopy}
        isCopied={isCopied}
        onOpenFullscreen={() => setIsFullscreen(true)}
      />
      <SchemaCodeModal
        isOpen={isFullscreen}
        onOpenChange={setIsFullscreen}
        message={{ data: { name, version }, schemaExtension: language, schemaContent: code }}
        onCopy={onCopy}
        isCopied={isCopied}
      />
    </>
  );
}
