import SwaggerUI from 'swagger-ui-react';
import "swagger-ui-react/swagger-ui.css";

interface OpenApiSpecProps {
    spec: string; 
}

export default function OpenApiSpec( {spec} : OpenApiSpecProps ) {
    return (
        <SwaggerUI spec={spec} />
    );
  }
  