import dynamic from 'next/dynamic';
import '@asyncapi/react-component/styles/default.min.css';

const AsyncApiComponent = dynamic(import('@asyncapi/react-component'), { ssr: false });

const config = {
  show: {
    errors: false,
  },
};

interface AsyncApiSpecProps {
  spec: string;
}

export default function AsyncApiSpec({ spec }: AsyncApiSpecProps) {
  return (
    <div className={`my-4 border border-gray-300 border-dashed px-5 `}>
      <AsyncApiComponent schema={spec} config={config} />
    </div>
  );
}
