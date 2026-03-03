import type { Example } from './types';

export const example: Example = {
  name: 'OpenAPI Remote Import',
  group: 'Getting Started',
  description: 'Import commands and queries from a remote OpenAPI spec (Swagger Petstore) via URL',
  source: {
    'main.ec': `// Commands and queries generated from remote OpenAPI spec (Swagger Petstore)
import commands { addPet, updatePet, deletePet } from "https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml"
import queries { findPetsByStatus, getPetById } from "https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml"

visualizer main {
  name "Pet Store (Remote OpenAPI Import)"

  // Service that receives the imported commands and queries
  service PetStoreAPI {
    version 1.0.0
    summary "Manages pets in the store"

    receives command addPet
    receives command updatePet
    receives command deletePet
    receives query findPetsByStatus
    receives query getPetById
  }

  // New service that integrates with the OpenAPI service
  service PetAdoptionApp {
    version 1.0.0
    summary "Customer-facing pet adoption application"

    sends query findPetsByStatus
    sends query getPetById
    sends command addPet
  }
}
`,
  },
};
