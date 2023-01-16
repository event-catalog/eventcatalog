import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(import('swagger-ui-react'), { ssr: false });

interface OpenApiSpecProps {
  spec: string;
  showTitle?: boolean;
  url?: string;
}

export default function OpenApiSpec({ spec, showTitle = true, url }: OpenApiSpecProps) {
  const className = !showTitle ? 'swagger-hide-title' : '';

  return (
    <div className={`my-4 border border-gray-300 border-dashed px-5 eventcatalog-swagger ${className}`}>
      {!showTitle && <span className="text-2xl block mt-10 font-bold -mb-8">OpenAPI Specification</span>}
      <SwaggerUI spec={spec} tryItOutEnabled={false} url={url} />
    </div>
  );
}
