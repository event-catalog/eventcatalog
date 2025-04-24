import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { BookOpen, Send } from 'lucide-react';
import { CreateWebWorkerMLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';
import { useChat, type Message } from '../hooks/ChatProvider';
import React from 'react';

// Update Message type to include resources
interface Resource {
  id: string;
  type: string;
  url: string;
  title?: string;
}

// Move formatMessageContent outside component since it doesn't use any component state or props
const formatMessageContent = (content: string, resources?: Resource[]): string => {
  // First handle any full resource tags by replacing them with just their ID/title
  content = content.replace(/<resource[^>]*?id="([^"]*)"[^>]*?>/g, '$1');

  // First escape <resource> tags
  let formattedContent = content.replace(/<resource[^>]*>/g, (match) => {
    return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });

  // If we have resources, convert matching IDs to links
  if (resources?.length) {
    // Create a regex pattern that matches any resource ID/title
    const resourceMatches = resources.map((r) => ({
      pattern: r.title || r.id,
      url: r.url,
      type: r.type,
    }));

    // Sort by length (longest first) to prevent partial matches
    resourceMatches.sort((a, b) => b.pattern.length - a.pattern.length);

    // Replace matches with links, but skip if already inside an HTML tag
    for (const { pattern, url, type } of resourceMatches) {
      // Updated regex to match whole words only using word boundaries \b
      const regex = new RegExp(`(?<!<[^>]*)\\b(${pattern})\\b(?![^<]*>)`, 'g');
      formattedContent = formattedContent.replace(
        regex,
        `<a href="${url}" class="text-purple-600 hover:text-purple-800" target="_blank" rel="noopener noreferrer">$1 (${type})</a>`
      );
    }
  }

  // Handle code blocks
  formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
    const escapedCode = codeContent.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="bg-gray-800 border border-gray-700 p-4 my-3 rounded-lg overflow-x-auto"><code class="text-sm font-mono text-gray-200">${escapedCode}</code></pre>`;
  });

  // Handle inline code
  formattedContent = formattedContent.replace(/(?<!`)`([^`]+)`(?!`)/g, (match, code) => {
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<code class="bg-gray-500 border border-gray-700 px-2 py-0.5 rounded text-sm font-mono text-gray-200">${escapedCode}</code>`;
  });

  // Handle bold text with double asterisks
  formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert newlines to <br>
  formattedContent = formattedContent.replace(/\n(?!<\/code>)/g, '<br>');

  return formattedContent;
};

// Create a memoized Message component
const ChatMessage = React.memo(({ message }: { message: Message }) => (
  <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
    <div
      className={`max-w-[80%] rounded-lg p-3 ${
        message.isUser ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
      }`}
    >
      <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content, message.resources) }} />
      {!message.isUser && message.resources && message.resources.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Referenced Resources:</p>
          <div className="text-[10px]">
            {message.resources.map((resource, idx) => (
              <span key={resource.id}>
                <a
                  href={resource.url}
                  className="text-purple-600 hover:text-purple-800"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resource.title || resource.id} ({resource.type})
                </a>
                {idx < (message.resources?.length || 0) - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
));

ChatMessage.displayName = 'ChatMessage';

interface ChatWindowProps {
  model?: string;
  max_tokens?: number;
  similarityResults?: number;
}

const ChatWindow = ({
  model = 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
  max_tokens = 4096,
  similarityResults = 50,
}: ChatWindowProps) => {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [engine, setEngine] = useState<any>(null);
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [vectorWorker, setVectorWorker] = useState<Worker | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const completionRef = useRef<any>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const { currentSession, storeMessagesToSession, updateSession, isStreaming, setIsStreaming } = useChat();

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      console.log('currentSession', currentSession.messages);
      setMessages(currentSession.messages);
      setShowWelcome(false);
    } else {
      setMessages([]);
      setShowWelcome(true);
    }
  }, [currentSession]);

  // If the messages change add them to the session
  useEffect(() => {
    if (currentSession) {
      storeMessagesToSession(currentSession.id, messages);
    }
  }, [messages]);

  // Helper function to stop the current completion
  const handleStop = useCallback(async () => {
    if (completionRef.current) {
      try {
        await engine.interruptGenerate();
        completionRef.current = null;
        setIsStreaming(false);
        setIsThinking(false);
      } catch (error) {
        console.error('Error stopping completion:', error);
      }
    }
  }, [engine]);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || !engine) return;

    // Add to messages
    setMessages((prev) => [...prev, { content: inputValue, isUser: true, timestamp: Date.now() }]);

    setIsThinking(true);
    setIsStreaming(true);
    setInputValue('');

    // if the first message, update the session title
    if (currentSession) {
      updateSession({
        ...currentSession,
        title: inputValue.length > 25 ? `${inputValue.substring(0, 22)}...` : inputValue,
      });
    }

    // Add input to vector store
    vectorWorker?.postMessage({ input: inputValue, similarityResults });

    // @ts-ignore
    vectorWorker.onmessage = async (event) => {
      if (event.data.action === 'search-results') {
        console.log('Results', event?.data?.results);

        // Extract resources from results and ensure uniqueness by ID
        const resources = Array.from(
          new Map(
            event.data.results.map((result: any) => {
              const metadata = result[0].metadata;
              const resource: Resource = {
                id: metadata.id,
                type: metadata.type,
                url: `/docs/${metadata.type}s/${metadata.id}`,
                title: metadata.title || metadata.id,
              };
              return [metadata.id, resource]; // Use ID as key for Map
            })
          ).values()
        );

        console.log('resources', resources);

        const qaPrompt = `\n".

          You are an expert in event-driven architecture and domain-driven design, specializing in documentation for EventCatalog.

          You assist developers, architects, and business stakeholders who need information about their event-driven system catalog. You help with questions about:
          - Events (asynchronous messages that notify about something that has happened)
          - Commands (requests to perform an action)
          - Queries (requests for information)
          - Services (bounded contexts or applications that produce/consume events)
          - Domains (business capabilities or functional areas)

          IMPORTANT RULES:
          1. Resources will be provided to you in <resource> tags. ONLY use these resources to answer questions.
          2. NEVER include ANY <resource> tags in your responses. This is a strict requirement.
          3. ALWAYS refer to resources by their name/ID/title attributes only.
          4. If asked about specific resource types (e.g., "What domains do we have?"), simply list their names without elaboration.
          5. NEVER invent or make up resources that aren't provided to you.

          RESPONSE FORMAT EXAMPLES:
          ✓ CORRECT: "The SubscriptionService produces the UserSubscribed event."
          ✗ INCORRECT: "<resource id="SubscriptionService">...</resource> produces events."

          When responding:
          1. Use only information from the provided resources
          2. Explain connections between resources when relevant
          3. Use appropriate technical terminology
          4. Use clear formatting with headings and bullet points when helpful
          5. State clearly when information is missing rather than making assumptions
          6. Don't provide code examples unless specifically requested

          Your primary goal is to help users understand their event-driven system through accurate documentation interpretation.

                ==========
                ${(resources as Resource[])
                  .map((resource: Resource) => {
                    return `<resource ${Object.entries(resource)
                      .filter(([key, value]) => key !== 'markdown' && key !== 'loc')
                      .map(([key, value]) => {
                        return `${key}="${value}"`;
                      })
                      .join(' ')} />`;
                  })
                  .join('\n')}\n
                ==========
               
                ""
                `;

        console.log('qaPrompt', qaPrompt);
        try {
          // Get completion
          const completion = await engine.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: qaPrompt,
              },
              // previous messages
              ...messages.map((msg) => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.content,
              })),
              {
                role: 'user',
                content: inputValue,
              },
            ],
            stream: true,
            temperature: 0.1,
            max_tokens,
            top_p: 0.9,
            top_k: 40,
            frequency_penalty: 0.1,
            presence_penalty: 0,
          });

          // Store completion reference for potential cancellation
          completionRef.current = completion;

          let isFirstChunk = true;
          let responseText = '';

          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                responseText += content;

                if (isFirstChunk) {
                  setIsThinking(false);
                  setMessages((prev) => [
                    ...prev,
                    {
                      content: responseText,
                      isUser: false,
                      timestamp: Date.now(),
                    },
                  ]);
                  isFirstChunk = false;
                } else {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: responseText,
                    };
                    return newMessages;
                  });
                }
                scrollToBottom();
              }
            }

            // Add resources after streaming is complete
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                content: responseText,
                resources: resources as { id: string; type: string; url: string; title?: string }[],
              };
              return newMessages;
            });
          } catch (error: any) {
            if (error.message?.includes('cancelled')) {
              console.log('Completion was stopped by the user');
            } else {
              throw error;
            }
          }

          setIsThinking(false);
          setIsStreaming(false);
          completionRef.current = null;
        } catch (error: any) {
          console.error('Error:', error);
          const errorMessage = {
            content: 'Sorry, there was an error processing your request.',
            isUser: false,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsThinking(false);
          setIsStreaming(false);
          completionRef.current = null;
        }
      }
    };
  }, [inputValue, engine, messages, currentSession, vectorWorker]);

  const initProgressCallback = (report: InitProgressReport) => {
    console.log('Loading LLM locally', report);
    setLoadingProgress(Math.round(report.progress * 100));
    if (report.progress === 1) {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initEngine = async () => {
      try {
        // Cache the LLMs text file
        const engineCreator = CreateWebWorkerMLCEngine;
        const newEngine = await engineCreator(
          new Worker(new URL('../workers/engine.ts', import.meta.url), { type: 'module' }),
          model,
          { initProgressCallback }
        );
        setEngine(newEngine);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    const importDocuments = async () => {
      const worker = new Worker(new URL('../workers/document-importer.ts', import.meta.url), { type: 'module' });
      worker.postMessage({ init: true });
      setVectorWorker(worker);
    };

    importDocuments();
    initEngine();
  }, []);

  // Add new function to handle smooth scrolling
  const scrollToBottom = useCallback((smooth = true) => {
    if (outputRef.current) {
      outputRef.current.scrollTo({
        top: outputRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Add effect to scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Memoize static JSX elements
  const welcomeMessage = useMemo(
    () => (
      <div id="welcomeMessage" className="flex justify-center items-center h-full">
        <div className="text-center space-y-6 max-w-2xl px-4">
          <div className="flex justify-center">
            <BookOpen size={48} strokeWidth={1.5} className="text-gray-400" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-gray-800">Ask questions about your architecture</h1>
            <p className="text-sm text-gray-500">AI Models are local and do not leave your device.</p>
          </div>
        </div>
      </div>
    ),
    []
  );

  // Memoize the messages list with the new ChatMessage component
  const messagesList = useMemo(
    () => (
      <div className="space-y-4 max-w-[900px] mx-auto">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isThinking && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center space-x-2 max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800 rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    ),
    [messages, isThinking]
  );

  // Memoize the input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-60px)] w-full">
      {/* Chat Messages */}
      <div id="output" ref={outputRef} className="flex-1 overflow-y-auto p-4 space-y-4 w-full mx-auto">
        {showWelcome || messages.length === 0 ? welcomeMessage : messagesList}
      </div>

      {/* Loading Status */}
      {loading && (
        <div className="max-w-[900px] mx-auto w-full px-4">
          <div id="loadingStatus" className="mb-2 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-center loading-status">
            <span className="block">
              Initializing AI model...
              {loadingProgress > 0 && `(${loadingProgress}%)`}
            </span>
            <span className="block text-xs text-gray-500">
              Loading model into your browser, this may take a minute or two. The first time it will take longer then the model is
              cached.
            </span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-[900px] mx-auto relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="What events do we have?"
            className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg border border-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed pr-24"
            disabled={loading || isStreaming}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || isStreaming}
                className="px-4 py-2 flex items-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-sm font-medium"
              >
                {/* Add icon */}
                <Send size={16} strokeWidth={1.5} className="mr-2" />
                Send
              </button>
            )}
          </div>
        </div>
        <div className="max-w-[900px] mx-auto flex justify-between">
          {/* show what model is loaded */}
          <p className="text-xs text-gray-400 mt-2">Model: {model}</p>
          <p className="text-xs text-gray-500 mt-2">EventCatalog Chat can make mistakes. Check important info.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
