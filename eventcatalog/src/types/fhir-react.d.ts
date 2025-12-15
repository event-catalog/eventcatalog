declare module 'fhir-react' {

  import { ComponentType } from 'react';



  export const fhirVersions: {

    DSTU2: string;

    STU3: string;

    R4: string;

  };



  export interface FhirResourceProps {

    fhirResource: any;

    fhirVersion?: string;

    withCarinBBProfile?: boolean;

  }



  export const FhirResource: ComponentType<FhirResourceProps>;

}
