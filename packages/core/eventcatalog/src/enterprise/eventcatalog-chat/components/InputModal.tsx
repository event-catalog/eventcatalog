import React, { useEffect, useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Wand2 } from 'lucide-react';
// TODO: Import ChatPrompt and ChatPromptInput from a central types location
import type { ChatPrompt } from '@enterprise/eventcatalog-chat/utils/chat-prompts';

// Define the possible resource list types
type ResourceListType = 'resource-list-events' | 'resource-list-commands' | 'resource-list-services' | 'resource-list-queries';

// Define ChatPromptInput type based on usage
// NOTE: This should ideally match the schema defined for Astro content collections
interface ChatPromptInput {
  id: string;
  label: string;
  type: 'text' | ResourceListType | 'select' | 'code' | 'text-area'; // Use the union type, add 'select', 'code', 'text-area'
  options?: string[]; // Add optional options for select type
}

// Define Resource type based on usage in ChatWindow
interface Resource {
  id: string;
  type: string; // e.g., 'event', 'command', 'service', 'query'
  url: string;
  title?: string;
  name?: string;
}

// --- Input Modal Component ---
interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: ChatPrompt | null;
  onSubmit: (prompt: ChatPrompt, inputValues: Record<string, string>) => void;
  resources: Resource[]; // Add resources prop
}

// Helper to extract resource type from input type string
const getResourceTypeFromInputType = (inputType: ResourceListType): string => {
  return inputType.replace('resource-list-', '');
};

const InputModal: React.FC<InputModalProps> = ({ isOpen, onClose, prompt, onSubmit, resources }) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Memoize resource filtering based on prompt inputs
  const filteredResourcesByType = useMemo(() => {
    const resourceMap: Record<string, Resource[]> = {};
    prompt?.data?.inputs?.forEach((input) => {
      if (input.type.startsWith('resource-list-')) {
        const resourceType = getResourceTypeFromInputType(input.type as ResourceListType);
        const filtered = resources.filter((r) => r.type === resourceType);
        resourceMap[input.id] = filtered;
      }
    });
    return resourceMap;
  }, [prompt, resources]);

  // Reset input values when the prompt or resources change
  useEffect(() => {
    if (prompt?.data?.inputs) {
      const initialValues: Record<string, string> = {};
      prompt.data.inputs.forEach((input) => {
        const relevantResources = filteredResourcesByType[input.id];
        if (input.type.startsWith('resource-list-') && relevantResources?.length > 0) {
          initialValues[input.id] = relevantResources[0].id; // Pre-select the first available resource
        } else {
          initialValues[input.id] = ''; // Initialize others with empty strings
        }
      });
      setInputValues(initialValues);
    } else {
      setInputValues({}); // Clear if no inputs
    }
  }, [prompt, filteredResourcesByType]); // Depend on memoized filtered resources

  if (!prompt || !prompt.data?.inputs) {
    return null; // Don't render if no prompt or inputs
  }

  const handleInputChange = (id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation: Check if all required fields are filled
    const allFilled = prompt?.data?.inputs?.every((input) => {
      if (input.type.startsWith('resource-list-')) {
        return inputValues[input.id] && inputValues[input.id] !== '';
      }
      return inputValues[input.id]?.trim();
    });

    if (allFilled) {
      // Pass the selected resource NAME for resource lists, not the ID
      const processedValues = { ...inputValues };
      prompt.data.inputs?.forEach((input) => {
        if (input.type.startsWith('resource-list-')) {
          const relevantResources = filteredResourcesByType[input.id] || [];
          const selectedResource = relevantResources.find((r) => r.id === processedValues[input.id]);
          // Use resource name if available, otherwise fallback to the submitted ID (which might be name if no resource found)
          processedValues[input.id] = selectedResource?.name || processedValues[input.id];
        }
      });
      onSubmit(prompt, processedValues);
    } else {
      alert('Please fill in all required fields.');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-50 p-8 shadow-xl focus:outline-none data-[state=open]:animate-contentShow z-[100]">
          <Dialog.Title className="text-lg font-semibold text-gray-800 mb-3">{prompt.data.title}</Dialog.Title>
          <Dialog.Description className="mt-1 mb-6 text-sm text-gray-600">
            Please provide the following details:
          </Dialog.Description>
          <form onSubmit={handleSubmit} className="space-y-4">
            {prompt.data.inputs.map((input: ChatPromptInput) => {
              const isResourceList = input.type.startsWith('resource-list-');
              const isSelect = input.type === 'select';
              const isCode = input.type === 'code';
              const isTextArea = input.type === 'text-area'; // Added for potential future use or consistency
              const resourceType = isResourceList ? getResourceTypeFromInputType(input.type as ResourceListType) : '';
              const relevantResources = filteredResourcesByType[input.id] || [];

              return (
                <div key={input.id}>
                  <label htmlFor={input.id} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {input.label}
                  </label>
                  {isResourceList ? (
                    <select
                      id={input.id}
                      name={input.id}
                      value={inputValues[input.id] || ''}
                      onChange={(e) => handleInputChange(input.id, e.target.value)}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-1 sm:text-sm transition duration-150 ease-in-out"
                    >
                      <option value="" disabled>
                        Select a {resourceType}...
                      </option>
                      {relevantResources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.name || resource.id} {/* Display name or ID as fallback */}
                        </option>
                      ))}
                      {relevantResources.length === 0 && (
                        <option value="" disabled>
                          No {resourceType}s found
                        </option>
                      )}
                    </select>
                  ) : isSelect ? (
                    <select
                      id={input.id}
                      name={input.id}
                      value={inputValues[input.id] || ''}
                      onChange={(e) => handleInputChange(input.id, e.target.value)}
                      required
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-1 sm:text-sm transition duration-150 ease-in-out"
                    >
                      <option value="" disabled>
                        Select an option...
                      </option>
                      {input.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      {(!input.options || input.options.length === 0) && (
                        <option value="" disabled>
                          No options available
                        </option>
                      )}
                    </select>
                  ) : (
                    <>
                      {isCode || isTextArea ? (
                        <textarea
                          id={input.id}
                          name={input.id}
                          value={inputValues[input.id] || ''}
                          onChange={(e) => handleInputChange(input.id, e.target.value)}
                          onKeyDown={(e) => {
                            // Prevent form submission on Enter key press unless Shift is held
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              // Optionally, you could trigger submission here if needed,
                              // but the default behavior is just to prevent it.
                              handleSubmit(e); // Example: trigger submit manually
                            }
                          }}
                          required
                          rows={isCode ? 6 : 3} // More rows for code input
                          className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-1 sm:text-sm transition duration-150 ease-in-out ${isCode ? 'font-mono text-sm' : ''}`}
                          placeholder={isCode ? 'Paste your code here...' : ''}
                        />
                      ) : (
                        <input
                          type="text"
                          id={input.id}
                          name={input.id}
                          value={inputValues[input.id] || ''}
                          onChange={(e) => handleInputChange(input.id, e.target.value)}
                          required
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-1 sm:text-sm transition duration-150 ease-in-out"
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div className="mt-6 flex justify-end space-x-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  onClick={onClose} // Ensure onClose is called when Cancel is clicked
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <Wand2 size={16} />
                Submit
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
// --- End Input Modal Component ---

export default InputModal;
